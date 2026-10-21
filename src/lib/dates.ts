// Timezone-aware date helpers. Task due dates are stored as YYYY-MM-DDT12:00Z,
// so their calendar day is simply the first 10 characters.
export function dayKey(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export const dueKey = (due: string | null) => (due ? due.slice(0, 10) : null);

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(key, -dow);
}

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
}

export function greeting(timeZone: string): string {
  let h = new Date().getHours();
  try {
    h = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  } catch { /* use local */ }
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

type T = { status: string; due_date: string | null; completed_at: string | null; created_at: string };

/** Summary metrics derived only from real task rows. */
export function taskMetrics(tasks: T[], today: string, tz: string) {
  const open = tasks.filter((t) => t.status !== "done");
  return {
    open: open.length,
    dueToday: open.filter((t) => dueKey(t.due_date) === today).length,
    overdue: open.filter((t) => { const k = dueKey(t.due_date); return k !== null && k < today; }).length,
    completedToday: tasks.filter((t) => t.status === "done" && t.completed_at && dayKey(new Date(t.completed_at), tz) === today).length,
  };
}

/** Per-day created/completed counts for the last `days` days, oldest first. */
export function activitySeries(tasks: T[], today: string, tz: string, days: number) {
  const keys = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  const idx = new Map(keys.map((k, i) => [k, i]));
  const rows = keys.map((k) => ({ day: k, created: 0, completed: 0 }));
  for (const t of tasks) {
    const c = idx.get(dayKey(new Date(t.created_at), tz));
    if (c !== undefined) rows[c].created++;
    if (t.completed_at) {
      const d = idx.get(dayKey(new Date(t.completed_at), tz));
      if (d !== undefined) rows[d].completed++;
    }
  }
  return rows;
}

/** Sort open tasks: overdue first, then due date, then priority. */
const PRI = { urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
export function byPriority<U extends { due_date: string | null; priority: string }>(a: U, b: U) {
  const da = dueKey(a.due_date) ?? "9999", db = dueKey(b.due_date) ?? "9999";
  if (da !== db) return da < db ? -1 : 1;
  return (PRI[a.priority] ?? 9) - (PRI[b.priority] ?? 9);
}
