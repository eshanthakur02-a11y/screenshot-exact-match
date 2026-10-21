// Data-access layer for tasks. All reads/writes go through these server
// functions; UI components never query the database directly.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { taskInputSchema, taskUpdateSchema } from "@/lib/task-schema";
import type { TablesUpdate } from "@/integrations/supabase/types";

const toTimestamp = (d: string | null | undefined) =>
  d === undefined ? undefined : d === null ? null : `${d}T12:00:00Z`;

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .order("status", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load tasks.");
    return data;
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => taskInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        status: data.status,
        due_date: toTimestamp(data.due_date) ?? null,
        estimated_minutes: data.estimated_minutes ?? null,
        project_id: data.project_id ?? null,
        source: data.source,
        completed_at: data.status === "done" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("createTask", error);
      throw new Error("The task could not be saved.");
    }
    return row; // the actual saved record
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => taskUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, due_date, ...rest } = data;
    const patch: TablesUpdate<"tasks"> = { ...rest };
    if (due_date !== undefined) patch.due_date = toTimestamp(due_date);
    if (rest.status) patch.completed_at = rest.status === "done" ? new Date().toISOString() : null;
    const { data: row, error } = await context.supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !row) throw new Error("The task could not be updated.");
    return row;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase
      .from("tasks")
      .delete({ count: "exact" })
      .eq("id", data.id);
    if (error || !count) throw new Error("The task could not be deleted.");
    return { id: data.id };
  });

/** AI capture: returns a draft for review. Nothing is saved here. */
export const captureTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().trim().min(3).max(2000),
        today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { extractTask, AiError } = await import("@/lib/ai/extract-task.server");
    try {
      return { ok: true as const, draft: await extractTask(data.text, data.today) };
    } catch (e) {
      const message = e instanceof AiError ? e.message : "Could not read that task.";
      return { ok: false as const, error: message };
    }
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: tasks, error }, { data: profile }] = await Promise.all([
      context.supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      context.supabase.from("profiles").select("display_name").eq("id", context.userId).maybeSingle(),
    ]);
    if (error) throw new Error("Could not load your dashboard.");
    return { tasks: tasks ?? [], displayName: profile?.display_name ?? null };
  });
