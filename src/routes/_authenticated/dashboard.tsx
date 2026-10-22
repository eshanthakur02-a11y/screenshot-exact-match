import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Clock, Folder, ListTodo,
  RefreshCw, Sparkles, Target,
} from "lucide-react";
import { getDashboard } from "@/lib/data/tasks.functions";
import { createBriefing, listGoals, listProjects } from "@/lib/data/workspace.functions";
import { activitySeries, byPriority, dayKey, dueKey, formatDay, greeting, taskMetrics } from "@/lib/dates";
import { shellQuery } from "./route";
import { TaskCapture } from "@/components/task-capture";
import { TaskRow } from "@/components/task-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dashboardQuery = queryOptions({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
const projectsQuery = queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });
const goalsQuery = queryOptions({ queryKey: ["goals"], queryFn: () => listGoals() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AetherMind" }, { name: "description", content: "Your AetherMind productivity overview." }, { property: "og:title", content: "Dashboard — AetherMind" }, { property: "og:description", content: "Your AetherMind productivity overview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) =>
    Promise.all([dashboardQuery, projectsQuery, goalsQuery, shellQuery].map((q) => context.queryClient.ensureQueryData(q as typeof dashboardQuery))),
  pendingComponent: DashboardSkeleton,
  errorComponent: ({ error, reset }) => (
    <div role="alert" className="glass rounded-2xl p-8 text-center">
      <p className="font-semibold">We couldn't load your dashboard.</p>
      <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </div>
  ),
  component: Dashboard,
});

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-12 w-72 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

const card = "glass rounded-2xl p-5";
type Tab = "today" | "upcoming" | "overdue" | "completed";

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: goals } = useSuspenseQuery(goalsQuery);
  const { data: shell } = useSuspenseQuery(shellQuery);
  const tz = shell.timezone;
  const today = dayKey(new Date(), tz);
  const m = taskMetrics(data.tasks, today, tz);
  const open = useMemo(() => data.tasks.filter((t) => t.status !== "done").sort(byPriority), [data.tasks]);
  const [tab, setTab] = useState<Tab>("today");
  const [range, setRange] = useState(7);
  const series = useMemo(() => activitySeries(data.tasks, today, tz, range), [data.tasks, today, tz, range]);
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name;

  const tabTasks = {
    today: open.filter((t) => dueKey(t.due_date) === today),
    upcoming: open.filter((t) => { const k = dueKey(t.due_date); return !k || k > today; }),
    overdue: open.filter((t) => { const k = dueKey(t.due_date); return k !== null && k < today; }),
    completed: data.tasks.filter((t) => t.status === "done").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
  }[tab];

  const upcoming = open.filter((t) => { const k = dueKey(t.due_date); return k !== null && k >= today; }).slice(0, 5);
  const created = series.reduce((s, r) => s + r.created, 0);
  const completed = series.reduce((s, r) => s + r.completed, 0);
  const name = data.displayName ?? shell.displayName;

  const metrics = [
    { label: "Open tasks", value: m.open, hint: "Not yet done", icon: ListTodo, tone: "text-primary", filter: "open" as const },
    { label: "Due today", value: m.dueToday, hint: "On today's date", icon: CalendarClock, tone: "text-magenta", filter: "open" as const, alert: m.dueToday > 0 },
    { label: "Overdue", value: m.overdue, hint: "Past their due date", icon: AlertTriangle, tone: "text-priority-high", filter: "open" as const, alert: m.overdue > 0 },
    { label: "Completed today", value: m.completedToday, hint: "Marked done today", icon: CheckCircle2, tone: "text-success", filter: "done" as const },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-semibold md:text-5xl">{greeting(tz)}{name ? `, ${name.split(" ")[0]}` : ""} 👋</h1>
          <p className="mt-2 text-muted-foreground">Here is your productivity overview for today.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: tz })} · {tz}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon, tone, filter, alert }) => (
          <Link key={label} to="/tasks" search={{ filter }} className={cn(card, "group transition hover:-translate-y-0.5 hover:border-primary/40", alert && "border-primary/40")}>
            <div className="flex items-center justify-between">
              <span className={cn("flex size-9 items-center justify-center rounded-xl bg-secondary", tone)}><Icon className="size-4" /></span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </div>
            <p className={cn("mt-4 font-display text-4xl font-semibold", alert && tone)}>{value}</p>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </Link>
        ))}
      </div>

      {data.tasks.length === 0 && (
        <div className={cn(card, "text-center")}>
          <p className="font-semibold">Welcome to AetherMind</p>
          <p className="text-sm text-muted-foreground">Create your first task below — your metrics, briefing and charts fill in as you go.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <TaskCapture />
        <DailyBriefing today={today} tasks={open} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className={card} aria-labelledby="prio">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="prio" className="text-2xl font-semibold">Today's priorities</h2>
            <Link to="/tasks" className="text-sm text-muted-foreground hover:text-foreground">View all tasks →</Link>
          </div>
          <div role="tablist" className="mt-4 flex flex-wrap gap-1.5">
            {(["today", "upcoming", "overdue", "completed"] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={cn("rounded-full px-3.5 py-1.5 text-sm capitalize transition", tab === t ? "bg-gradient-brand text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                {t}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Ordered by due date, then priority.</p>
          {tabTasks.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing here right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {tabTasks.slice(0, 6).map((t) => (
                <div key={t.id}>
                  <TaskRow task={t} />
                  {projectName(t.project_id) && <p className="ml-12 mt-0.5 text-xs text-muted-foreground"><Folder className="mr-1 inline size-3" />{projectName(t.project_id)}</p>}
                </div>
              ))}
            </ul>
          )}
        </section>

        <section className={card} aria-labelledby="deadlines">
          <div className="flex items-center justify-between">
            <h2 id="deadlines" className="text-2xl font-semibold">Upcoming deadlines</h2>
            <Link to="/calendar" className="text-sm text-muted-foreground hover:text-foreground">View calendar →</Link>
          </div>
          {m.overdue > 0 && (
            <Link to="/tasks" search={{ filter: "open" }} className="mt-4 flex items-center gap-2 rounded-xl border border-priority-high/40 bg-priority-high/10 p-3 text-sm text-priority-high">
              <AlertTriangle className="size-4" /> {m.overdue} overdue {m.overdue === 1 ? "task needs" : "tasks need"} attention
            </Link>
          )}
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No dated tasks coming up.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcoming.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-[10px] leading-tight">
                    <span className="font-semibold text-primary">{formatDay(dueKey(t.due_date)!, { month: "short" })}</span>
                    <span className="text-sm font-semibold">{formatDay(dueKey(t.due_date)!, { day: "numeric" })}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{dueKey(t.due_date) === today ? "Today" : formatDay(dueKey(t.due_date)!, { weekday: "long" })}{t.estimated_minutes ? ` · ${t.estimated_minutes} min` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className={card} aria-labelledby="activity">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="activity" className="text-2xl font-semibold">Productivity</h2>
            <div className="flex gap-1">
              {[7, 30, 90].map((r) => (
                <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={cn("rounded-lg px-2.5 py-1 text-xs", range === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{r}d</button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Last {range} days: {created} created, {completed} completed
            {created > 0 ? ` · ${Math.round((completed / created) * 100)}% completion ratio` : ""}.
          </p>
          <div className="mt-4 h-56" role="img" aria-label={`Bar chart of tasks created and completed per day over the last ${range} days`}>
            {created + completed === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No activity in this period yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.map((r) => ({ ...r, label: formatDay(r.day, range === 7 ? { weekday: "short" } : { month: "short", day: "numeric" }) }))}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} width={24} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="created" name="Created" fill="var(--primary-deep)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="var(--magenta)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className={card} aria-labelledby="proj">
            <div className="flex items-center justify-between">
              <h2 id="proj" className="text-2xl font-semibold">Active projects</h2>
              <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
            </div>
            {projects.filter((p) => p.status === "active").length === 0 ? (
              <Link to="/projects" search={{ new: true }} className="mt-4 block rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground hover:text-foreground">Create your first project</Link>
            ) : (
              <ul className="mt-4 space-y-3">
                {projects.filter((p) => p.status === "active").slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link to="/tasks" search={{ project: p.id }} className="block">
                      <div className="flex justify-between text-sm"><span className="font-medium">{p.name}</span><span className="text-muted-foreground">{p.progress}%</span></div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-brand" style={{ width: `${p.progress}%` }} /></div>
                      <p className="mt-1 text-xs text-muted-foreground">{p.done}/{p.total} tasks done{p.nextDue ? ` · next due ${formatDay(p.nextDue)}` : ""}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={card} aria-labelledby="goals">
            <div className="flex items-center justify-between">
              <h2 id="goals" className="text-2xl font-semibold">Goals</h2>
              <Link to="/goals" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
            </div>
            {goals.filter((g) => g.status === "active").length === 0 ? (
              <Link to="/goals" search={{ new: true }} className="mt-4 block rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground hover:text-foreground">Set your first goal</Link>
            ) : (
              <ul className="mt-4 space-y-3">
                {goals.filter((g) => g.status === "active").slice(0, 3).map((g) => (
                  <li key={g.id} className="flex items-center gap-3">
                    <Target className="size-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{g.next ? `Next: ${g.next.title}` : "No open milestones"}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{g.progress}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

type Brief = { focus: string; top_task_ids: string[]; plan: string[]; warnings: string[] };

function DailyBriefing({ today, tasks }: { today: string; tasks: { id: string; title: string; priority: string; due_date: string | null }[] }) {
  const run = useServerFn(createBriefing);
  const [state, setState] = useState<{ brief?: Brief | undefined; at?: string | undefined; error?: string | undefined; busy?: boolean | undefined }>({});
  const [collapsed, setCollapsed] = useState(false);

  async function generate() {
    setState((s) => ({ ...s, busy: true, error: undefined }));
    try {
      const r = await run({ data: { today } });
      setState(r.ok ? { brief: r.briefing, at: r.generatedAt } : { error: r.error });
    } catch {
      setState({ error: "Could not create your briefing. Please try again." });
    }
  }
  const top = (state.brief?.top_task_ids ?? []).map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as typeof tasks;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-background-2 p-5 shadow-glow md:p-6" aria-labelledby="brief">
      <div className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-magenta/15 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary"><Sparkles className="size-3.5" /> AI daily briefing</p>
          <h2 id="brief" className="mt-1 text-2xl font-semibold">Your plan for today</h2>
        </div>
        <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand briefing" : "Collapse briefing"} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
          {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>
      {!collapsed && (
        <div className="relative mt-4 space-y-4">
          {!state.brief && !state.error && (
            <p className="text-sm text-muted-foreground">Get a short plan based on your open tasks, priorities and deadlines.</p>
          )}
          {state.error && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p>{state.error}</p>
              <p className="mt-1 text-muted-foreground">Meanwhile, plan manually: start with your overdue tasks, then today's priorities.</p>
            </div>
          )}
          {state.brief && (
            <>
              <p className="font-display text-lg">{state.brief.focus}</p>
              {top.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top priorities</p>
                  <ol className="space-y-1.5">
                    {top.map((t, i) => (
                      <li key={t.id}><Link to="/tasks" search={{ q: t.title }} className="flex items-center gap-2 rounded-lg bg-card/70 px-3 py-2 text-sm hover:bg-card"><span className="text-primary">{i + 1}.</span>{t.title}</Link></li>
                    ))}
                  </ol>
                </div>
              )}
              {state.brief.plan.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{state.brief.plan.map((p) => <li key={p}>{p}</li>)}</ul>
              )}
              {state.brief.warnings.map((w) => (
                <p key={w} className="flex items-start gap-2 text-sm text-priority-medium"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{w}</p>
              ))}
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />Generated {new Date(state.at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · AI suggestion, not saved</p>
            </>
          )}
          <Button onClick={generate} disabled={state.busy} variant={state.brief ? "outline" : "default"} className={cn(!state.brief && "bg-gradient-brand")}>
            {state.busy ? "Thinking…" : state.brief ? <><RefreshCw /> Refresh briefing</> : <><Sparkles /> Generate briefing</>}
          </Button>
        </div>
      )}
    </section>
  );
}
