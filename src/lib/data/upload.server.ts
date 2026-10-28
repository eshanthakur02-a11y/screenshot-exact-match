import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function uploadIdentity(request: Request) {
  const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) throw new Error("Sign in before uploading.");
  const url = process.env["SUPABASE_URL"],
    key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Uploads are not configured.");
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Your session expired. Sign in again.");
  return { db, userId: data.user.id };
}

export async function boundedFormData(request: Request, limit: number) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit) throw new Error("The uploaded file is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("No file was uploaded.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("The uploaded file is too large.");
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new Response(bytes, {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  }).formData();
}
