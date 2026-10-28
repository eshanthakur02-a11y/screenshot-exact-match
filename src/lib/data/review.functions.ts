import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calendarDateSchema } from "@/lib/task-schema";
import { weeklyMetrics } from "@/lib/weekly-metrics";
import { weekStart } from "@/lib/dates";

const period = z
  .object({ week_start: calendarDateSchema.refine((v) => weekStart(v) === v, "Choose a Monday") })
  .strict();

export const getReviewPeriod = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => period.parse(i))
  .handler(async ({ data, context }) => {
    const [tasks, milestones, projects, goals, profile] = await Promise.all([
      context.supabase.from("tasks").select("*"),
      context.supabase.from("milestones").select("*"),
      context.supabase.from("projects").select("id,name,status"),
      context.supabase.from("goals").select("id,title,status"),
      context.supabase.from("profiles").select("timezone").eq("id", context.userId).single(),
    ]);
    if ([tasks.error, milestones.error, projects.error, goals.error, profile.error].some(Boolean))
      throw new Error("Could not load all review records. Try again.");
    return {
      metrics: weeklyMetrics(
        tasks.data ?? [],
        milestones.data ?? [],
        data.week_start,
        profile.data?.timezone ?? "UTC",
      ),
      projects: projects.data ?? [],
      goals: goals.data ?? [],
    };
  });

export const generateWeeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => period.parse(i))
  .handler(async ({ data, context }) => {
    // Read directly here, not through another RPC stub.
    const [tasks, milestones, projects, goals, profile] = await Promise.all([
      context.supabase.from("tasks").select("*"),
      context.supabase.from("milestones").select("*"),
      context.supabase.from("projects").select("id,name,status"),
      context.supabase.from("goals").select("id,title,status"),
      context.supabase.from("profiles").select("timezone").eq("id", context.userId).single(),
    ]);
    if ([tasks.error, milestones.error, projects.error, goals.error, profile.error].some(Boolean))
      throw new Error("Could not load all review records. No review was generated.");
    const { generateWeeklyInsight } = await import("@/lib/ai/intelligence.server");
    return generateWeeklyInsight({
      metrics: weeklyMetrics(
        tasks.data ?? [],
        milestones.data ?? [],
        data.week_start,
        profile.data?.timezone ?? "UTC",
      ),
      outstandingTasks: (tasks.data ?? [])
        .filter((t) => t.status !== "done")
        .map((t) => ({
          title: t.title,
          priority: t.priority,
          due_date: t.due_date,
          project_id: t.project_id,
          goal_id: t.goal_id,
        })),
      projects: projects.data,
      goals: goals.data,
    });
  });

export const listReviewHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weekly_reviews")
      .select("week_start,updated_at")
      .order("week_start", { ascending: false });
    if (error) throw new Error("Could not load saved reviews.");
    return data ?? [];
  });
