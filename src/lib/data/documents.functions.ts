import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calendarDateSchema, documentExtractionSchema } from "@/lib/task-schema";

export const listDocuments = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("documents").select("id,name,created_at,reference_date").order("created_at", { ascending: false });
  if (error) throw new Error("Could not load documents.");
  return data ?? [];
});

export const getDocument = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).strict().parse(i)).handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("documents").select("*").eq("id", data.id).single();
    if (error || !row) throw new Error("This document is unavailable.");
    const parsed = documentExtractionSchema.safeParse(row.candidates);
    return { ...row, extraction: parsed.success ? parsed.data : null };
  });

export const savePastedDocument = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ name: z.string().trim().min(1).max(200), text: z.string().trim().min(3).max(80000), reference_date: calendarDateSchema.nullable() }).strict().parse(i))
  .handler(async ({ data, context }) => {
    const bytes = new TextEncoder().encode(`${data.text}\nreference:${data.reference_date ?? "unknown"}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const { data: row, error } = await context.supabase.from("documents").upsert({ user_id: context.userId, name: data.name, content: data.text, content_hash: hash, reference_date: data.reference_date }, { onConflict: "user_id,content_hash", ignoreDuplicates: true }).select("id").maybeSingle();
    if (error) throw new Error("Could not save the source document.");
    if (row) return row;
    const existing = await context.supabase.from("documents").select("id").eq("user_id", context.userId).eq("content_hash", hash).single();
    if (existing.error || !existing.data) throw new Error("Could not reopen the existing source.");
    return existing.data;
  });

export const analyseDocument = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).strict().parse(i)).handler(async ({ data, context }) => {
    const [doc, projects, goals, profile] = await Promise.all([
      context.supabase.from("documents").select("*").eq("id", data.id).single(),
      context.supabase.from("projects").select("id,name"), context.supabase.from("goals").select("id,title"),
      context.supabase.from("profiles").select("timezone").eq("id", context.userId).single(),
    ]);
    if (!doc.data || [doc.error,projects.error,goals.error,profile.error].some(Boolean)) throw new Error("Could not load the source and related records.");
    const cached = documentExtractionSchema.safeParse(doc.data.candidates);
    if (cached.success) return cached.data;
    const { extractDocumentItems } = await import("@/lib/ai/intelligence.server");
    const extraction = await extractDocumentItems({ text: doc.data.content, reference_date: doc.data.reference_date, timezone: profile.data?.timezone ?? "UTC", projects: projects.data ?? [], goals: goals.data ?? [] });
    const { error } = await context.supabase.from("documents").update({ candidates: extraction }).eq("id", data.id);
    if (error) throw new Error("Extraction could not be stored. No tasks were created.");
    return extraction;
  });