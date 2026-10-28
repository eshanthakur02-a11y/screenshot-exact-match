import { extractText, getDocumentProxy } from "unpdf";
import { calendarDateSchema } from "@/lib/task-schema";
import { boundedFormData, uploadIdentity } from "./upload.server";

export async function uploadDocument(request: Request) {
  let identity: Awaited<ReturnType<typeof uploadIdentity>>;
  try { identity = await uploadIdentity(request); }
  catch { return Response.json({ error: "Sign in before uploading a document." }, { status: 401 }); }
  try {
    const form = await boundedFormData(request, 10 * 1024 * 1024 + 65536);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) throw new Error("Choose a nonempty document under 10 MB.");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["txt","md","markdown","pdf"].includes(ext ?? "")) throw new Error("Supported files are TXT, Markdown and PDF.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let content: string;
    if (ext === "pdf") {
      if (new TextDecoder().decode(bytes.slice(0,5)) !== "%PDF-") throw new Error("That file is not a valid PDF.");
      const pdf = await getDocumentProxy(bytes);
      try {
        if (pdf.numPages > 100) throw new Error("Choose a PDF with 100 pages or fewer.");
        content = (await extractText(pdf, { mergePages: true })).text.trim();
      } finally { await pdf.loadingTask.destroy(); }
      if (content.length < 3) throw new Error("This PDF has no readable text. Use a text-based PDF or paste the notes; scanned pages need OCR first.");
    } else {
      try { content = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim(); }
      catch { throw new Error("Save the document as UTF-8 text and try again."); }
      if (content.includes("\u0000")) throw new Error("The file is not readable text.");
    }
    if (content.length < 3 || content.length > 80000) throw new Error("Choose a document containing 3–80,000 characters of text.");
    const reference = form.get("reference_date");
    const referenceDate = typeof reference === "string" && reference ? calendarDateSchema.parse(reference) : null;
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${content}\nreference:${referenceDate ?? "unknown"}`))), (b) => b.toString(16).padStart(2,"0")).join("");
    const { db, userId } = identity;
    const existing = await db.from("documents").select("id").eq("content_hash", hash).maybeSingle();
    if (existing.error) throw new Error("Could not check for an earlier upload.");
    if (existing.data) return Response.json(existing.data);
    const path = `${userId}/${hash}.${ext}`;
    const stored = await db.storage.from("source-documents").upload(path, file, { contentType: ext === "pdf" ? "application/pdf" : "text/plain", upsert: true });
    if (stored.error) throw new Error("The private source file could not be stored.");
    const inserted = await db.from("documents").upsert({ user_id: userId, name: file.name.slice(0,200), content, content_hash: hash, storage_path: path, reference_date: referenceDate }, { onConflict: "user_id,content_hash", ignoreDuplicates: true }).select("id").maybeSingle();
    if (inserted.error) throw new Error("Could not save document details. Retry this upload.");
    if (inserted.data) return Response.json(inserted.data);
    const prior = await db.from("documents").select("id").eq("content_hash", hash).single();
    if (prior.error || !prior.data) throw new Error("Could not reopen the source document.");
    return Response.json(prior.data);
  } catch (error) {
    // Parser failures may contain source content; never log raw errors.
    return Response.json({ error: error instanceof Error && /Choose|Supported|valid PDF|readable text|UTF-8|private source|document|upload|source/.test(error.message) ? error.message : "This document could not be read. Try a text-based PDF or paste the notes." }, { status: 400 });
  }
}