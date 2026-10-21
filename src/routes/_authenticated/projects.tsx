import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Folder, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createProject, deleteProject, listProjects, updateProject } from "@/lib/data/workspace.functions";
import { formatDay } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const projectsQuery = queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });
type Project = Awaited<ReturnType<typeof listProjects>>[number];
const STATUS = ["active", "on_hold", "completed", "archived"] as const;

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — AetherMind" }, { name: "description", content: "Organize your work into projects." }] }),
  validateSearch: z.object({ new: z.boolean().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error.message}</p>,
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState<Project | "new" | null>(search.new ? "new" : null);
  const [showArchived, setShowArchived] = useState(false);
  const qc = useQueryClient();
  const remove = useServerFn(deleteProject);
  const shown = projects.filter((p) => showArchived || p.status !== "archived");

  async function del(p: Project) {
    if (!confirm(`Delete "${p.name}"? Its tasks are kept but unlinked.`)) return;
    try { await remove({ data: { id: p.id } }); toast.success("Project deleted"); qc.invalidateQueries(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  }
  const close = () => { setEditing(null); if (search.new) navigate({ search: {} }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl font-semibold">Projects</h1><p className="text-muted-foreground">Progress is completed tasks out of all tasks in the project.</p></div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived</label>
          <Button onClick={() => setEditing("new")} className="bg-gradient-brand"><Plus /> New project</Button>
        </div>
      </div>
      {shown.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Folder className="mx-auto size-8 text-accent" />
          <p className="mt-3 font-semibold">No projects yet</p>
          <p className="text-sm text-muted-foreground">Group related tasks to see their progress in one place.</p>
          <Button className="mt-4" onClick={() => setEditing("new")}>Create your first project</Button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id} className="glass flex flex-col rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-sans text-lg font-semibold">{p.name}</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{p.status.replace("_", " ")}</span>
              </div>
              {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
              <div className="mt-4 flex justify-between text-sm"><span>{p.done}/{p.total} tasks</span><span>{p.progress}%</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-brand" style={{ width: `${p.progress}%` }} /></div>
              <p className="mt-2 text-xs text-muted-foreground">{p.nextDue ? `Next deadline ${formatDay(p.nextDue)}` : "No upcoming deadlines"}</p>
              <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                <Link to="/tasks" search={{ project: p.id, filter: "all" }} className="mr-auto text-sm text-primary hover:underline">View tasks →</Link>
                <Button size="icon" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil /></Button>
                <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => del(p)}><Trash2 /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === "new" ? "New project" : "Edit project"}</DialogTitle></DialogHeader>
          {editing && <ProjectForm project={editing === "new" ? null : editing} onDone={close} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectForm({ project, onDone }: { project: Project | null; onDone: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createProject);
  const update = useServerFn(updateProject);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: project?.name ?? "", description: project?.description ?? "", status: (project?.status ?? "active") as (typeof STATUS)[number] });
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { name: f.name, description: f.description || null, status: f.status };
      if (project) await update({ data: { id: project.id, ...payload } }); else await create({ data: payload });
      toast.success(project ? "Project updated" : "Project created");
      qc.invalidateQueries(); onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="p-name">Name</Label><Input id="p-name" required maxLength={200} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="p-desc">Description</Label><Textarea id="p-desc" maxLength={2000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="p-status">Status</Label>
        <select id="p-status" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}>
          {STATUS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
    </form>
  );
}
