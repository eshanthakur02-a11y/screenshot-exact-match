import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { addMilestone, createGoal, deleteGoal, deleteMilestone, listGoals, setMilestoneDone, updateGoal } from "@/lib/data/workspace.functions";
import { formatDay } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const goalsQuery = queryOptions({ queryKey: ["goals"], queryFn: () => listGoals() });
type Goal = Awaited<ReturnType<typeof listGoals>>[number];

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goals — AetherMind" }, { name: "description", content: "Break big goals into milestones." }] }),
  validateSearch: z.object({ new: z.boolean().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(goalsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{(error as Error).message}</p>,
  component: GoalsPage,
});

function GoalsPage() {
  const { data: goals } = useSuspenseQuery(goalsQuery);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState<Goal | "new" | null>(search.new ? "new" : null);
  const close = () => { setEditing(null); if (search.new) navigate({ search: {} }); };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl font-semibold">Goals</h1><p className="text-muted-foreground">Progress is completed milestones out of all milestones.</p></div>
        <Button onClick={() => setEditing("new")} className="bg-gradient-brand"><Plus /> New goal</Button>
      </div>
      {goals.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Target className="mx-auto size-8 text-accent" />
          <p className="mt-3 font-semibold">No goals yet</p>
          <p className="text-sm text-muted-foreground">Set a goal, then add the milestones that get you there.</p>
          <Button className="mt-4" onClick={() => setEditing("new")}>Set your first goal</Button>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">{goals.map((g) => <GoalCard key={g.id} goal={g} onEdit={() => setEditing(g)} />)}</ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === "new" ? "New goal" : "Edit goal"}</DialogTitle></DialogHeader>
          {editing && <GoalForm goal={editing === "new" ? null : editing} onDone={close} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const qc = useQueryClient();
  const remove = useServerFn(deleteGoal);
  const add = useServerFn(addMilestone);
  const toggle = useServerFn(setMilestoneDone);
  const removeMs = useServerFn(deleteMilestone);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast.success(ok); qc.invalidateQueries(); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await act(() => add({ data: { goal_id: goal.id, title, due_date: due || null } }), "Milestone added");
    setTitle(""); setDue("");
  }
  return (
    <li className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-sans text-lg font-semibold">{goal.title}</h2>
          <p className="text-xs text-muted-foreground"><span className="capitalize">{goal.status}</span>{goal.target_date ? ` · target ${formatDay(goal.target_date, { month: "short", day: "numeric", year: "numeric" })}` : ""}</p>
        </div>
        <div className="flex">
          <Button size="icon" variant="ghost" aria-label="Edit goal" onClick={onEdit}><Pencil /></Button>
          <Button size="icon" variant="ghost" aria-label="Delete goal" onClick={() => confirm(`Delete "${goal.title}" and its milestones?`) && act(() => remove({ data: { id: goal.id } }), "Goal deleted")}><Trash2 /></Button>
        </div>
      </div>
      {goal.description && <p className="mt-2 text-sm text-muted-foreground">{goal.description}</p>}
      <div className="mt-4 flex justify-between text-sm"><span>{goal.milestones.filter((m) => m.completed_at).length}/{goal.milestones.length} milestones</span><span>{goal.progress}%</span></div>
      <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-brand" style={{ width: `${goal.progress}%` }} /></div>
      <ul className="mt-4 space-y-1.5">
        {goal.milestones.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!m.completed_at} onCheckedChange={(v) => act(() => toggle({ data: { id: m.id, done: v === true } }))} aria-label={`Mark ${m.title} done`} />
            <span className={m.completed_at ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{m.title}</span>
            {m.due_date && <span className="text-xs text-muted-foreground">{formatDay(m.due_date)}</span>}
            <button aria-label={`Remove ${m.title}`} className="text-muted-foreground hover:text-foreground" onClick={() => act(() => removeMs({ data: { id: m.id } }))}><X className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <Input aria-label="New milestone" placeholder="Add a milestone…" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <Input aria-label="Milestone due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
        <Button type="submit" variant="outline" size="icon" aria-label="Add milestone"><Plus /></Button>
      </form>
    </li>
  );
}

function GoalForm({ goal, onDone }: { goal: Goal | null; onDone: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createGoal);
  const update = useServerFn(updateGoal);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: goal?.title ?? "", description: goal?.description ?? "", target_date: goal?.target_date ?? "", status: (goal?.status ?? "active") as "active" | "achieved" | "abandoned" });
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { title: f.title, description: f.description || null, target_date: f.target_date || null, status: f.status };
      if (goal) await update({ data: { id: goal.id, ...payload } }); else await create({ data: payload });
      toast.success(goal ? "Goal updated" : "Goal created"); qc.invalidateQueries(); onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="g-title">Goal</Label><Input id="g-title" required maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="g-desc">Description</Label><Textarea id="g-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="g-date">Target date</Label><Input id="g-date" type="date" value={f.target_date} onChange={(e) => setF({ ...f, target_date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="g-status">Status</Label>
          <select id="g-status" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}>
            <option value="active">active</option><option value="achieved">achieved</option><option value="abandoned">abandoned</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
    </form>
  );
}
