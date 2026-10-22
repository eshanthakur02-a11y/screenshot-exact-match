import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listTasks } from "@/lib/data/tasks.functions";
import { getWeeklyReview, listGoals, listProjects, saveWeeklyReview } from "@/lib/data/workspace.functions";
import { addDays, dayKey, dueKey, formatDay, weekStart } from "@/lib/dates";
import { shellQuery } from "./route";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const tasksQuery = queryOptions({ queryKey: ["tasks"], queryFn: () => listTasks() });
const projectsQuery = queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });
const goalsQuery = queryOptions({ queryKey: ["goals"], queryFn: () => listGoals() });
const reviewQuery = (week_start: string) => queryOptions({ queryKey: ["review", week_start], queryFn: () => getWeeklyReview({ data: { week_start } }) });

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Weekly Review — AetherMind" }, { name: "description", content: "Look back on your week and plan the next." }, { property: "og:title", content: "Weekly Review — AetherMind" }, { property: "og:description", content: "Look back on your week and plan the next." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => Promise.all([tasksQuery, projectsQuery, goalsQuery, shellQuery].map((q) => context.queryClient.ensureQueryData(q as typeof tasksQuery))),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{(error as Error).message}</p>,
  component: ReviewPage,
});

function ReviewPage() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: goals } = useSuspenseQuery(goalsQuery);
  const { data: shell } = useSuspenseQuery(shellQuery);
  const tz = shell.timezone;
  const today = dayKey(new Date(), tz);
  const ws = weekStart(today);
  const we = addDays(ws, 6);
  const { data: saved } = useSuspenseQuery(reviewQuery(ws));
  const save = useServerFn(saveWeeklyReview);
  const qc = useQueryClient();
  const [text, setText] = useState(saved?.summary ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(saved?.summary ?? ""), [saved?.summary]);

  const done = tasks.filter((t) => t.completed_at && dayKey(new Date(t.completed_at), tz) >= ws && dayKey(new Date(t.completed_at), tz) <= we);
  const outstanding = tasks.filter((t) => t.status !== "done");
  const overdue = outstanding.filter((t) => dueKey(t.due_date) && dueKey(t.due_date)! < today);
  const nextWeek = outstanding.filter((t) => { const k = dueKey(t.due_date); return k && k > we && k <= addDays(we, 7); });

  async function submit() {
    setBusy(true);
    try { await save({ data: { week_start: ws, summary: text } }); toast.success("Review saved"); qc.invalidateQueries({ queryKey: ["review", ws] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(false); }
  }

  const List = ({ title, items }: { title: string; items: { id: string; title: string }[] }) => (
    <section className="glass rounded-2xl p-5">
      <h2 className="font-sans text-base font-semibold">{title} <span className="text-muted-foreground">({items.length})</span></h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">None.</p> : <ul className="mt-2 space-y-1 text-sm">{items.slice(0, 8).map((t) => <li key={t.id} className="truncate">• {t.title}</li>)}</ul>}
    </section>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-4xl font-semibold">Weekly Review</h1><p className="text-muted-foreground">{formatDay(ws)} – {formatDay(we)} · measured from your records</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <List title="Completed this week" items={done} />
        <List title="Still outstanding" items={outstanding} />
        <List title="Overdue" items={overdue} />
        <List title="Due next week" items={nextWeek} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass rounded-2xl p-5">
          <h2 className="font-sans text-base font-semibold">Project progress</h2>
          {projects.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No projects.</p> : <ul className="mt-2 space-y-1 text-sm">{projects.filter((p) => p.status !== "archived").map((p) => <li key={p.id} className="flex justify-between"><span>{p.name}</span><span className="text-muted-foreground">{p.progress}%</span></li>)}</ul>}
        </section>
        <section className="glass rounded-2xl p-5">
          <h2 className="font-sans text-base font-semibold">Goal progress</h2>
          {goals.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No goals.</p> : <ul className="mt-2 space-y-1 text-sm">{goals.map((g) => <li key={g.id} className="flex justify-between"><span>{g.title}</span><span className="text-muted-foreground">{g.progress}%</span></li>)}</ul>}
        </section>
      </div>
      <section className="glass rounded-2xl p-5">
        <label htmlFor="rev" className="font-sans text-base font-semibold">Your reflection</label>
        <p className="text-sm text-muted-foreground">Achievements, blockers, and what to focus on next week.</p>
        <Textarea id="rev" className="mt-3 min-h-40" value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{saved ? `Last saved ${new Date(saved.updated_at).toLocaleString()}` : "Not saved yet"}</p>
          <Button onClick={submit} disabled={busy || !text.trim()} className="bg-gradient-brand">{busy ? "Saving…" : "Save review"}</Button>
        </div>
      </section>
    </div>
  );
}
