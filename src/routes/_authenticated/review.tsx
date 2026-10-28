import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { getWeeklyReview, saveWeeklyReview } from "@/lib/data/workspace.functions";
import { generateWeeklyReview, getReviewPeriod, listReviewHistory } from "@/lib/data/review.functions";
import { addDays, dayKey, formatDay, weekStart } from "@/lib/dates";
import type { WeeklyInsight } from "@/lib/task-schema";
import { shellQuery } from "./route";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const historyQuery = queryOptions({ queryKey: ["review-history"], queryFn: () => listReviewHistory() });
const periodQuery = (week_start: string) => queryOptions({ queryKey: ["review-period", week_start], queryFn: () => getReviewPeriod({ data: { week_start } }) });
const savedQuery = (week_start: string) => queryOptions({ queryKey: ["review", week_start], queryFn: () => getWeeklyReview({ data: { week_start } }) });

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Weekly Review — AetherMind" }, { name: "description", content: "Review real weekly progress and save your edited AI reflection." }, { property: "og:title", content: "Weekly Review — AetherMind" }, { property: "og:description", content: "Review real weekly progress and save your edited AI reflection." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => {
    const shell = await context.queryClient.ensureQueryData(shellQuery);
    const ws = weekStart(dayKey(new Date(), shell.timezone));
    await Promise.all([context.queryClient.ensureQueryData(historyQuery), context.queryClient.ensureQueryData(periodQuery(ws)), context.queryClient.ensureQueryData(savedQuery(ws))]);
  },
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error.message}</p>,
  component: ReviewPage,
});

const sectionLabels: Record<keyof WeeklyInsight, string> = {
  accomplishments: "Key accomplishments", blockers: "Incomplete tasks and blockers", goal_progress: "Progress toward goals",
  patterns: "Patterns and bottlenecks", next_priorities: "Three priorities for next week", follow_up: "Follow-up actions",
};
function insightText(insight: WeeklyInsight) {
  return Object.entries(sectionLabels).map(([key, label]) => `${label}\n${insight[key as keyof WeeklyInsight].map((v) => `• ${v}`).join("\n") || "No supporting data available."}`).join("\n\n");
}

function ReviewPage() {
  const { data: shell } = useSuspenseQuery(shellQuery);
  const { data: history } = useSuspenseQuery(historyQuery);
  const [ws, setWs] = useState(() => weekStart(dayKey(new Date(), shell.timezone)));
  return <div className="space-y-6">
    <WorkspaceNavigation />
    <div className="flex flex-wrap items-end justify-between gap-4"><h1 className="text-4xl font-semibold">Weekly Review</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWs(addDays(ws,-7))}><ChevronLeft /></Button>
        <Input aria-label="Review week" type="date" value={ws} onChange={(e) => { if (e.target.value) setWs(weekStart(e.target.value)); }} className="w-40" />
        <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWs(addDays(ws,7))}><ChevronRight /></Button>
      </div>
    </div>
    {history.length > 0 && <div className="flex flex-wrap gap-2"><label htmlFor="saved-week" className="self-center text-sm text-muted-foreground">Saved reviews</label><select id="saved-week" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={history.some((h) => h.week_start === ws) ? ws : ""} onChange={(e) => { if (e.target.value) setWs(e.target.value); }}><option value="">Choose a saved week</option>{history.map((h) => <option key={h.week_start} value={h.week_start}>{formatDay(h.week_start, { year: "numeric",month:"short",day:"numeric" })}</option>)}</select></div>}
    <ReviewPeriod key={ws} ws={ws} />
  </div>;
}

function ReviewPeriod({ ws }: { ws: string }) {
  const { data: period } = useSuspenseQuery(periodQuery(ws));
  const { data: saved } = useSuspenseQuery(savedQuery(ws));
  const generate = useServerFn(generateWeeklyReview), save = useServerFn(saveWeeklyReview);
  const qc = useQueryClient();
  const [text, setText] = useState(saved?.summary ?? "");
  const [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false), [aiDraft, setAiDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = period.metrics;
  async function generateDraft() {
    setBusy(true); setError(null);
    try { setText(insightText(await generate({ data: { week_start: ws } }))); setAiDraft(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not generate a review."); }
    finally { setBusy(false); }
  }
  async function submit() {
    setBusy(true); setError(null);
    try { await save({ data: { week_start: ws, summary: text } }); await Promise.all([qc.invalidateQueries({ queryKey:["review",ws] }), qc.invalidateQueries({ queryKey:["review-history"] })]); setAiDraft(false); toast.success("Review saved"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save the review."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <p className="text-muted-foreground">{formatDay(ws)} – {formatDay(m.end)} · calculated from your records</p>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[
      ["Completed",m.completed],["In progress",m.inProgress],["Outstanding",m.outstanding],["Overdue by period end",m.overdue],
      ["Completion rate",`${m.completionRate}%`],["Carried over",m.carriedOver],["Projects progressed",m.progressedProjects.length],["Goals progressed",m.progressedGoals.length],
    ].map(([label,value]) => <div key={label} className="border-b border-border py-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}</div>
    <p className="text-xs text-muted-foreground">{m.limitation}</p>
    <div className="grid gap-6 md:grid-cols-2"><section><h2 className="font-sans text-base font-semibold">Completed in period</h2><ul className="mt-2 space-y-1 text-sm">{m.completedTasks.map((t) => <li key={t.id}>{t.title}</li>)}</ul>{!m.completedTasks.length && <p className="text-sm text-muted-foreground">No recorded completions.</p>}</section><section><h2 className="font-sans text-base font-semibold">Upcoming deadlines</h2><ul className="mt-2 space-y-1 text-sm">{m.upcomingDeadlines.map((t) => <li key={t.id}>{t.title} · {t.due_date?.slice(0,10)}</li>)}</ul>{!m.upcomingDeadlines.length && <p className="text-sm text-muted-foreground">No deadlines next week.</p>}</section></div>
    <section className="space-y-3 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor="rev" className="font-sans text-lg font-semibold">{aiDraft ? "AI-generated draft · not saved" : "Your reflection"}</label><Button variant="outline" disabled={busy} onClick={generateDraft}><Sparkles />{busy ? "Working…" : "Generate AI review"}</Button></div>
      <Textarea id="rev" className="min-h-80" value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} disabled={busy} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{saved ? `Last saved ${new Date(saved.updated_at).toLocaleString()}` : "Not saved yet"}</p><Button disabled={busy || !text.trim()} onClick={() => setConfirm(true)}><Save />Save review</Button></div>
    </section>
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Save this review?</AlertDialogTitle><AlertDialogDescription>{saved ? "This replaces your saved reflection for this week." : "Save your edited reflection for this week."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={submit}>Confirm save</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}