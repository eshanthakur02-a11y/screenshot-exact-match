import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { captureTask, createTask } from "@/lib/data/tasks.functions";
import { PRIORITIES, type ExtractedTask, type Priority } from "@/lib/task-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TaskCapture() {
  const qc = useQueryClient();
  const capture = useServerFn(captureTask);
  const save = useServerFn(createTask);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ExtractedTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyse() {
    setBusy(true);
    setError(null);
    setDraft(null);
    try {
      const res = await capture({ data: { text, today: localToday() } });
      if (res.ok) setDraft(res.draft);
      else setError(res.error);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!draft) return;
    setBusy(true);
    try {
      const saved = await save({
        data: {
          title: draft.title,
          description: draft.description,
          priority: draft.priority ?? "medium",
          status: draft.status ?? "todo",
          due_date: draft.due_date,
          estimated_minutes: draft.estimated_minutes,
          source: "ai_capture",
        },
      });
      // Success only after the database returned the saved row.
      toast.success(`Saved "${saved.title}"`);
      setDraft(null);
      setText("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The task could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof ExtractedTask>(k: K, v: ExtractedTask[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <Label htmlFor="capture" className="flex items-center gap-2 text-base font-semibold">
        <Sparkles className="size-4 text-accent" /> Capture a task
      </Label>
      <Textarea
        id="capture"
        className="mt-3 min-h-20"
        placeholder='e.g. "Complete my Generative AI assignment by Friday. High priority. About three hours."'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <Button onClick={analyse} disabled={busy || text.trim().length < 3}>
          {busy && !draft ? "Reading…" : "Read with AI"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {draft && (
        <div className="mt-5 space-y-4 border-t pt-5">
          <p className="text-sm text-muted-foreground">Check the details, then save.</p>
          {draft.needs_clarification && draft.clarification_question && (
            <p className="rounded-md bg-secondary p-3 text-sm">
              <strong>Question:</strong> {draft.clarification_question} You can edit the fields below or
              rewrite your sentence.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-title">Title</Label>
              <Input id="d-title" value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="d-desc">Notes</Label>
              <Input
                id="d-desc"
                value={draft.description ?? ""}
                placeholder="None"
                onChange={(e) => set("description", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-pri">Priority</Label>
              <select
                id="d-pri"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.priority ?? ""}
                onChange={(e) => set("priority", (e.target.value || null) as Priority | null)}
              >
                <option value="">Not stated (medium)</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-due">Due date</Label>
              <Input
                id="d-due"
                type="date"
                value={draft.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-est">Estimated minutes</Label>
              <Input
                id="d-est"
                type="number"
                min={1}
                value={draft.estimated_minutes ?? ""}
                placeholder="Not stated"
                onChange={(e) => set("estimated_minutes", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
              Discard
            </Button>
            <Button onClick={confirm} disabled={busy || !draft.title.trim()}>
              {busy ? "Saving…" : "Save task"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
