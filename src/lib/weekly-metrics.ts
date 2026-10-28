import { addDays, dayKey, dueKey } from "./dates";
import type { Tables } from "@/integrations/supabase/types";

export function weeklyMetrics(
  tasks: Tables<"tasks">[],
  milestones: Tables<"milestones">[],
  start: string,
  tz: string,
) {
  const end = addDays(start, 6);
  const inPeriod = (date: string) => {
    const k = dayKey(new Date(date), tz);
    return k >= start && k <= end;
  };
  const completed = tasks.filter(
    (t) => t.status === "done" && t.completed_at && inPeriod(t.completed_at),
  );
  // No status history exists: outstanding counts are explicitly current, not a historical reconstruction.
  const outstanding = tasks.filter(
    (t) => t.status !== "done" && dayKey(new Date(t.created_at), tz) <= end,
  );
  const overdue = outstanding.filter((t) => {
    const k = dueKey(t.due_date);
    return k && k < end;
  });
  const carried = outstanding.filter((t) => dayKey(new Date(t.created_at), tz) < start);
  const upcoming = outstanding.filter((t) => {
    const k = dueKey(t.due_date);
    return k && k > end && k <= addDays(end, 7);
  });
  const progressedProjects = new Set(completed.map((t) => t.project_id).filter(Boolean));
  const progressedGoals = new Set(
    milestones.filter((m) => m.completed_at && inPeriod(m.completed_at)).map((m) => m.goal_id),
  );
  const denominator = completed.length + outstanding.length;
  return {
    start,
    end,
    completed: completed.length,
    outstanding: outstanding.length,
    inProgress: outstanding.filter((t) => t.status === "in_progress").length,
    overdue: overdue.length,
    completionRate: denominator ? Math.round((completed.length / denominator) * 100) : 0,
    carriedOver: carried.length,
    progressedProjects: [...progressedProjects],
    progressedGoals: [...progressedGoals],
    completedTasks: completed.map((t) => ({ id: t.id, title: t.title })),
    upcomingDeadlines: upcoming.map((t) => ({ id: t.id, title: t.title, due_date: t.due_date })),
    limitation:
      "Outstanding and carry-over counts use current task status. Deleted records, status history and earlier project/goal percentages are unavailable. Completion rate = completed in period / (completed in period + currently outstanding created by period end).",
  };
}
