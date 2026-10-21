import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTask, listTasks, updateTask } from "@/lib/data/tasks.functions";
import { PRIORITIES, STATUSES, type Priority, type Status } from "@/lib/task-schema";
import type { Tables } from "@/integrations/supabase/types";
import { TaskRow } from "@/components/task-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const tasksQuery = queryOptions({ queryKey: ["tasks"], queryFn: () => listTasks() });

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — AetherMind" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: TasksPage,
});

type Filter = "open" | "all" | Status;
const selectCls = "h-9 rounded-md border border-input bg-background px-3 text-sm";

function TasksPage() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const [filter, setFilter] = useState<Filter>("open");
  const [priority, setPriority] = useState<Priority | "any">("any");
  const [editing, setEditing] = useState<Tables<"tasks"> | "new" | null>(null);

  const shown = tasks.filter(
    (t) =>
      (filter === "all" || (filter === "open" ? t.status !== "done" : t.status === filter)) &&
      (priority === "any" || t.priority === priority),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">Tasks</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New task
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Status filter" className={selectCls} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="open">Open</option>
          <option value="all">All</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <select aria-label="Priority filter" className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority | "any")}>
          <option value="any">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No tasks match.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} onEdit={() => setEditing(t)} />
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New task" : "Edit task"}</DialogTitle>
          </DialogHeader>
          {editing && <TaskForm task={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskForm({ task, onDone }: { task: Tables<"tasks"> | null; onDone: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createTask);
  const update = useServerFn(updateTask);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: (task?.priority ?? "medium") as Priority,
    status: (task?.status ?? "todo") as Status,
    due_date: task?.due_date ? task.due_date.slice(0, 10) : "",
    estimated_minutes: task?.estimated_minutes?.toString() ?? "",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      title: f.title,
      description: f.description || null,
      priority: f.priority,
      status: f.status,
      due_date: f.due_date || null,
      estimated_minutes: f.estimated_minutes ? Number(f.estimated_minutes) : null,
    };
    try {
      if (task) await update({ data: { id: task.id, ...payload } });
      else await create({ data: payload });
      toast.success(task ? "Task updated" : "Task saved");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="t-title">Title</Label>
        <Input id="t-title" required maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="t-desc">Notes</Label>
        <Input id="t-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t-pri">Priority</Label>
        <select id="t-pri" className={`${selectCls} w-full`} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t-status">Status</Label>
        <select id="t-status" className={`${selectCls} w-full`} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t-due">Due date</Label>
        <Input id="t-due" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t-est">Estimated minutes</Label>
        <Input id="t-est" type="number" min={1} value={f.estimated_minutes} onChange={(e) => setF({ ...f, estimated_minutes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}
