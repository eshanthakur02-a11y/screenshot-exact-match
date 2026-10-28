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
import { VoiceCapture } from "@/components/voice-capture";

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
    <div className="glass relative overflow-hidden rounded-2xl p-5 shadow-glow md:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/20 blur-3xl" />
      <Label htmlFor="capture" className="relative flex items-center gap-2 font-display text-2xl font-semibold">
        <Sparkles className="size-5 text-accent" /> What's on your mind?
      </Label>
      <p className="relative mt-1 text-sm text-muted-foreground">Capture a task, idea, or commitment. AetherMind will help organize it.</p>
      <Textarea
        id="capture"
        className="relative mt-4 min-h-24 bg-background/60"
        placeholder='e.g. "Finish my machine learning assignment by Friday, high priority, about two hours."'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="relative mt-3 flex justify-end gap-2">
        {(text || draft) && (
          <Button variant="ghost" onClick={() => { setText(""); setDraft(null); }} disabled={busy}>Clear</Button>
        )}
        <Button onClick={analyse} disabled={busy || text.trim().length < 3} className="bg-gradient-brand shadow-glow">
          {busy && !draft ? "Reading…" : "Read with AI"}
        </Button>
      </div>
      <VoiceCapture disabled={busy} onTranscript={(transcript) => { setText(transcript); setDraft(null); setError(null); }} />
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
