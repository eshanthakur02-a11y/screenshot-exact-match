import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { taskInputSchema, documentExtractionSchema, type TaskInput } from "@/lib/task-schema";

export async function checkTaskLinks(
  db: SupabaseClient<Database>,
  userId: string,
  links: { project_id?: string | null | undefined; goal_id?: string | null | undefined },
) {
  if (links.project_id) {
    const { data, error } = await db
      .from("projects")
      .select("id")
      .eq("id", links.project_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) throw new Error("The selected project is unavailable.");
  }
  if (links.goal_id) {
    const { data, error } = await db
      .from("goals")
      .select("id")
      .eq("id", links.goal_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) throw new Error("The selected goal is unavailable.");
  }
}

export async function saveTaskRow(db: SupabaseClient<Database>, userId: string, input: TaskInput) {
  const data = taskInputSchema.parse(input);
  await checkTaskLinks(db, userId, data);
  let importKey: string | null = null;
  if (data.document_import) {
    const { data: doc, error } = await db
      .from("documents")
      .select("id,candidates")
      .eq("id", data.document_import.document_id)
      .eq("user_id", userId)
      .single();
    const candidates = documentExtractionSchema.safeParse(doc?.candidates);
    if (error || !doc || !candidates.success || !candidates.data.items[data.document_import.index])
      throw new Error("This source item is unavailable. Reopen the document.");
    importKey = `${doc.id}:${data.document_import.index}`;
    const existing = await db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("import_key", importKey)
      .maybeSingle();
    if (existing.error) throw new Error("Could not check the previous import. Try again.");
    if (existing.data) return existing.data;
  }
  const { data: row, error } = await db
    .from("tasks")
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date ? `${data.due_date}T12:00:00Z` : null,
      estimated_minutes: data.estimated_minutes ?? null,
      project_id: data.project_id ?? null,
      goal_id: data.goal_id ?? null,
      source: data.source,
      import_key: importKey,
      completed_at: data.status === "done" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error?.code === "23505" && importKey) {
    const previous = await db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("import_key", importKey)
      .single();
    if (previous.data && !previous.error) return previous.data;
  }
  if (error || !row) {
    console.error("createTask failed", error?.code);
    throw new Error("The task could not be saved.");
  }
  return row;
}
