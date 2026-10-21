import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listTasks } from "@/lib/data/tasks.functions";
import { addDays, dayKey, dueKey, formatDay, weekStart } from "@/lib/dates";
import { shellQuery } from "./route";
import { cn } from "@/lib/utils";

const tasksQuery = queryOptions({ queryKey: ["tasks"], queryFn: () => listTasks() });

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — AetherMind" }, { name: "description", content: "Your task deadlines by day, week and month." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(tasksQuery), context.queryClient.ensureQueryData(shellQuery)]),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error.message}</p>,
  component: CalendarPage,
});

type View = "day" | "week" | "month" | "agenda";

function CalendarPage() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: shell } = useSuspenseQuery(shellQuery);
  const today = dayKey(new Date(), shell.timezone);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today);
  const byDay = new Map<string, typeof tasks>();
  for (const t of tasks) { const k = dueKey(t.due_date); if (k) byDay.set(k, [...(byDay.get(k) ?? []), t]); }

  const monthStart = `${cursor.slice(0, 7)}-01`;
  const days =
    view === "day" ? [cursor]
    : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(cursor), i))
    : Array.from({ length: 42 }, (_, i) => addDays(weekStart(monthStart), i));
  const step = (dir: 1 | -1) => {
    if (view === "day") setCursor(addDays(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, 7 * dir));
    else { const d = new Date(`${monthStart}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + dir); setCursor(d.toISOString().slice(0, 10)); }
  };
  const title = view === "day" ? formatDay(cursor, { weekday: "long", month: "long", day: "numeric" })
    : view === "week" ? `Week of ${formatDay(weekStart(cursor))}` : formatDay(monthStart, { month: "long", year: "numeric" });
  const agenda = [...byDay.entries()].filter(([k]) => k >= today).sort(([a], [b]) => a.localeCompare(b));
  const overdue = tasks.filter((t) => t.status !== "done" && dueKey(t.due_date) && dueKey(t.due_date)! < today);

  const Item = ({ t }: { t: (typeof tasks)[number] }) => (
    <Link to="/tasks" search={{ q: t.title, filter: "all" }} className={cn("block truncate rounded-md px-1.5 py-0.5 text-xs", t.status === "done" ? "bg-secondary text-muted-foreground line-through" : "bg-primary/20 hover:bg-primary/30")}>{t.title}</Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl font-semibold">Calendar</h1><p className="text-muted-foreground">Shows your task due dates. No external calendar is connected.</p></div>
        <div className="flex gap-1 rounded-xl bg-secondary p-1">
          {(["day", "week", "month", "agenda"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn("rounded-lg px-3 py-1.5 text-sm capitalize", view === v ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}>{v}</button>
          ))}
        </div>
      </div>
      {overdue.length > 0 && <p className="rounded-xl border border-priority-high/40 bg-priority-high/10 p-3 text-sm text-priority-high">{overdue.length} overdue {overdue.length === 1 ? "task" : "tasks"} not shown as upcoming.</p>}

      {view === "agenda" ? (
        <div className="glass rounded-2xl p-5">
          {agenda.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming deadlines.</p> : (
            <ul className="space-y-4">{agenda.map(([k, ts]) => (
              <li key={k}><p className="mb-1.5 text-sm font-semibold">{k === today ? "Today" : formatDay(k, { weekday: "long", month: "short", day: "numeric" })}</p><div className="space-y-1">{ts.map((t) => <Item key={t.id} t={t} />)}</div></li>
            ))}</ul>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => step(-1)} aria-label="Previous" className="rounded-md p-2 hover:bg-secondary"><ChevronLeft className="size-4" /></button>
            <div className="text-center"><p className="font-display text-xl font-semibold">{title}</p><button onClick={() => setCursor(today)} className="text-xs text-primary">Today</button></div>
            <button onClick={() => step(1)} aria-label="Next" className="rounded-md p-2 hover:bg-secondary"><ChevronRight className="size-4" /></button>
          </div>
          {view !== "day" && <div className="mb-1 grid grid-cols-7 text-center text-xs text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}</div>}
          <div className={cn("grid gap-1", view === "day" ? "grid-cols-1" : "grid-cols-7")}>
            {days.map((k) => (
              <div key={k} className={cn("min-h-24 rounded-lg border border-border p-1.5", view === "month" && k.slice(0, 7) !== monthStart.slice(0, 7) && "opacity-40", k === today && "border-primary")}>
                <p className={cn("mb-1 text-xs", k === today && "font-semibold text-primary")}>{Number(k.slice(8))}</p>
                <div className="space-y-1">{(byDay.get(k) ?? []).slice(0, view === "month" ? 3 : 20).map((t) => <Item key={t.id} t={t} />)}
                  {view === "month" && (byDay.get(k)?.length ?? 0) > 3 && <p className="text-[10px] text-muted-foreground">+{byDay.get(k)!.length - 3} more</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
