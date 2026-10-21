// Projects, goals, milestones, notifications, profile, weekly reviews and the
// AI briefing. All scoped to the signed-in user by RLS + explicit user_id.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const id = z.string().uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fail = (msg: string, e?: unknown) => { if (e) console.error(msg, e); throw new Error(msg); };

/* ---------- Shell (header) ---------- */
export const getShell = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { count }] = await Promise.all([
      context.supabase.from("profiles").select("display_name, timezone").eq("id", context.userId).maybeSingle(),
      context.supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    return { displayName: profile?.display_name ?? null, timezone: profile?.timezone ?? "UTC", unread: count ?? 0 };
  });

/* ---------- Profile ---------- */
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ display_name: z.string().trim().min(1).max(80), timezone: z.string().min(1).max(64) }).parse(i))
  .handler(async ({ data, context }) => {
    try { new Intl.DateTimeFormat("en", { timeZone: data.timezone }); } catch { fail("That timezone isn't recognised."); }
    const { data: row, error } = await context.supabase.from("profiles").update(data).eq("id", context.userId).select("display_name, timezone").single();
    if (error || !row) fail("Settings could not be saved.", error);
    return row!;
  });

/* ---------- Projects ---------- */
const projectInput = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
});

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: projects, error }, { data: tasks }] = await Promise.all([
      context.supabase.from("projects").select("*").order("created_at", { ascending: false }),
      context.supabase.from("tasks").select("project_id, status, due_date").not("project_id", "is", null),
    ]);
    if (error) fail("Could not load projects.", error);
    return (projects ?? []).map((p) => {
      const mine = (tasks ?? []).filter((t) => t.project_id === p.id);
      const done = mine.filter((t) => t.status === "done").length;
      const nextDue = mine.filter((t) => t.status !== "done" && t.due_date).map((t) => t.due_date!.slice(0, 10)).sort()[0] ?? null;
      // Progress = done tasks / all tasks; an empty project is 0%.
      return { ...p, total: mine.length, done, progress: mine.length ? Math.round((done / mine.length) * 100) : 0, nextDue };
    });
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => projectInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("projects").insert({ ...data, user_id: context.userId }).select("*").single();
    if (error || !row) fail("The project could not be saved.", error);
    return row!;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => projectInput.partial().extend({ id }).parse(i))
  .handler(async ({ data, context }) => {
    const { id: pid, ...patch } = data;
    const { data: row, error } = await context.supabase.from("projects").update(patch).eq("id", pid).select("*").single();
    if (error || !row) fail("The project could not be updated.", error);
    return row!;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id }).parse(i))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase.from("projects").delete({ count: "exact" }).eq("id", data.id);
    if (error || !count) fail("The project could not be deleted.", error);
    return { id: data.id };
  });

/* ---------- Goals & milestones ---------- */
const goalInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  target_date: dateStr.nullable().optional(),
  status: z.enum(["active", "achieved", "abandoned"]).optional(),
});

export const listGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: goals, error }, { data: ms }] = await Promise.all([
      context.supabase.from("goals").select("*").order("created_at", { ascending: false }),
      context.supabase.from("milestones").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    if (error) fail("Could not load goals.", error);
    return (goals ?? []).map((g) => {
      const milestones = (ms ?? []).filter((m) => m.goal_id === g.id);
      const done = milestones.filter((m) => m.completed_at).length;
      // Progress = completed milestones / all milestones; achieved goals are 100%.
      const progress = g.status === "achieved" ? 100 : milestones.length ? Math.round((done / milestones.length) * 100) : 0;
      return { ...g, milestones, progress, next: milestones.find((m) => !m.completed_at) ?? null };
    });
  });

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => goalInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("goals").insert({ ...data, user_id: context.userId }).select("*").single();
    if (error || !row) fail("The goal could not be saved.", error);
    return row!;
  });

export const updateGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => goalInput.partial().extend({ id }).parse(i))
  .handler(async ({ data, context }) => {
    const { id: gid, ...patch } = data;
    const { data: row, error } = await context.supabase.from("goals").update(patch).eq("id", gid).select("*").single();
    if (error || !row) fail("The goal could not be updated.", error);
    return row!;
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id }).parse(i))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase.from("goals").delete({ count: "exact" }).eq("id", data.id);
    if (error || !count) fail("The goal could not be deleted.", error);
    return { id: data.id };
  });

export const addMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ goal_id: id, title: z.string().trim().min(1).max(200), due_date: dateStr.nullable().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("milestones").insert({ ...data, user_id: context.userId }).select("*").single();
    if (error || !row) fail("The milestone could not be saved.", error);
    return row!;
  });

export const setMilestoneDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id, done: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("milestones").update({ completed_at: data.done ? new Date().toISOString() : null }).eq("id", data.id).select("*").single();
    if (error || !row) fail("The milestone could not be updated.", error);
    return row!;
  });

export const deleteMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id }).parse(i))
  .handler(async ({ data, context }) => {
    const { error, count } = await context.supabase.from("milestones").delete({ count: "exact" }).eq("id", data.id);
    if (error || !count) fail("The milestone could not be deleted.", error);
    return { id: data.id };
  });

/* ---------- Notifications ---------- */
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) fail("Could not load notifications.", error);
    return data ?? [];
  });

export const markNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: id.optional() }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) fail("Could not update notifications.", error);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notifications").delete().eq("id", data.id);
    if (error) fail("Could not dismiss the notification.", error);
    return { id: data.id };
  });

/* ---------- Weekly review ---------- */
export const getWeeklyReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ week_start: dateStr }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("weekly_reviews").select("*").eq("week_start", data.week_start).maybeSingle();
    return row ?? null;
  });

export const saveWeeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ week_start: dateStr, summary: z.string().trim().min(1).max(10000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("weekly_reviews")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id,week_start" })
      .select("*").single();
    if (error || !row) fail("The review could not be saved.", error);
    return row!;
  });

/* ---------- AI daily briefing (not persisted) ---------- */
export const createBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ today: dateStr }).parse(i))
  .handler(async ({ data, context }) => {
    const [{ data: tasks }, { data: projects }] = await Promise.all([
      context.supabase.from("tasks").select("id, title, priority, status, due_date, estimated_minutes, project_id").neq("status", "done").limit(60),
      context.supabase.from("projects").select("id, name, status").eq("status", "active"),
    ]);
    if (!tasks?.length) return { ok: false as const, error: "You have no open tasks yet — capture one to get a briefing." };
    const { generateBriefing } = await import("@/lib/ai/briefing.server");
    try {
      const b = await generateBriefing({ today: data.today, tasks: tasks.map((t) => ({ ...t, due_date: t.due_date?.slice(0, 10) ?? null })), projects: projects ?? [] });
      const valid = new Set(tasks.map((t) => t.id));
      return { ok: true as const, briefing: { ...b, top_task_ids: b.top_task_ids.filter((x) => valid.has(x)) }, generatedAt: new Date().toISOString() };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not create your briefing." };
    }
  });
