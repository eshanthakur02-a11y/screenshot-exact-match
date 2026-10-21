import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, updateTask } from "@/lib/data/tasks.functions";
import type { Tables } from "@/integrations/supabase/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const priorityClass: Record<string, string> = {
  low: "bg-priority-low",
  medium: "bg-priority-medium",
  high: "bg-priority-high",
  urgent: "bg-priority-urgent",
};

export function TaskRow({ task, onEdit }: { task: Tables<"tasks">; onEdit?: () => void }) {
  const qc = useQueryClient();
  const update = useServerFn(updateTask);
  const remove = useServerFn(deleteTask);
  const done = task.status === "done";
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  async function toggle() {
    try {
      await update({ data: { id: task.id, status: done ? "todo" : "done" } });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }
  async function del() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await remove({ data: { id: task.id } });
      toast.success("Task deleted");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const meta = [
    task.priority,
    task.status === "in_progress" ? "in progress" : null,
    task.due_date ? `due ${new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : null,
    task.estimated_minutes ? `${task.estimated_minutes} min` : null,
  ].filter(Boolean);

  return (
    <li className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <Checkbox checked={done} onCheckedChange={toggle} aria-label={`Mark ${task.title} done`} />
      <span className={cn("size-2 shrink-0 rounded-full", priorityClass[task.priority])} />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left" disabled={!onEdit}>
        <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>{task.title}</p>
        <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
      </button>
      <Button variant="ghost" size="icon" onClick={del} aria-label={`Delete ${task.title}`}>
        <Trash2 />
      </Button>
    </li>
  );
}
