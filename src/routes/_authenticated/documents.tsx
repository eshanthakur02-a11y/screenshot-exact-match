import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Sparkles, Upload, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { listDocuments, getDocument, savePastedDocument, analyseDocument } from "@/lib/data/documents.functions";
import { createTask } from "@/lib/data/tasks.functions";
import { listProjects, listGoals } from "@/lib/data/workspace.functions";
import { documentCandidateSchema, type DocumentCandidate, PRIORITIES } from "@/lib/task-schema";
import { authenticatedUpload } from "@/lib/upload-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const documentsQuery = queryOptions({ queryKey:["documents"], queryFn: () => listDocuments() });
const projectsQuery = queryOptions({ queryKey:["projects"], queryFn: () => listProjects() });
const goalsQuery = queryOptions({ queryKey:["goals"], queryFn: () => listGoals() });
export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta:[{ title:"Documents — AetherMind" },{ name:"description",content:"Extract and confirm action items from your private documents and meeting notes." },{ property:"og:title",content:"Documents — AetherMind" },{ property:"og:description",content:"Extract and confirm action items from private documents and meeting notes." },{ property:"og:type",content:"website" },{ name:"twitter:card",content:"summary" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(documentsQuery), context.queryClient.ensureQueryData(projectsQuery), context.queryClient.ensureQueryData(goalsQuery)]),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error instanceof Error ? error.message : "Could not load documents."}</p>, component: DocumentsPage,
});
type CandidateRow = { index: number; selected: boolean; item: DocumentCandidate; savedTitle?: string };
function DocumentsPage() {
  const { data: documents } = useSuspenseQuery(documentsQuery);
  const { data: projects } = useSuspenseQuery(projectsQuery);
  const { data: goals } = useSuspenseQuery(goalsQuery);
  const qc = useQueryClient();
  const paste = useServerFn(savePastedDocument), open = useServerFn(getDocument), analyse = useServerFn(analyseDocument), save = useServerFn(createTask);
  const [name,setName] = useState("Meeting notes"), [text,setText] = useState(""), [reference,setReference] = useState("");
  const [docId,setDocId] = useState<string | null>(null), [rows,setRows] = useState<CandidateRow[]>([]), [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null), [confirm,setConfirm] = useState(false), [analysed,setAnalysed] = useState(false);
  async function run(fn: () => Promise<void>) { setBusy(true);setError(null); try { await fn(); } catch(e) { setError(e instanceof Error ? e.message : "Something went wrong. Your tasks have not changed."); } finally { setBusy(false); } }
  async function load(id: string) {
    const d = await open({ data:{id} }); setDocId(d.id);setName(d.name);setText(d.content);setReference(d.reference_date ?? "");
    setRows((d.extraction?.items ?? []).map((item,index) => ({item,index,selected:true})));setAnalysed(Boolean(d.extraction));
  }
  async function extract(id: string) {
    const result = await analyse({data:{id}});setDocId(id);setRows(result.items.map((item,index) => ({item,index,selected:true})));setAnalysed(true);
    await qc.invalidateQueries({queryKey:["documents"]});
  }
  function update(index: number, patch: Partial<DocumentCandidate>) { setRows((old) => old.map((r) => r.index === index ? {...r,item:{...r.item,...patch}} : r)); }
  async function importSelected() {
    if (!docId) return;
    const failures: string[] = []; let count=0;
    for (const row of rows.filter((r) => r.selected && !r.savedTitle)) {
      const parsed = documentCandidateSchema.safeParse(row.item);
      if (!parsed.success) { failures.push(`${row.item.title || "Untitled"}: check the edited fields.`);continue; }
      const item=parsed.data;
      try {
        const result=await save({data:{title:item.title,description:[item.description,item.responsible_person ? `Responsible person: ${item.responsible_person}` : null,`Source: ${name}\nEvidence: ${item.evidence}`,item.uncertainties.length ? `Uncertainties: ${item.uncertainties.join("; ")}` : null].filter(Boolean).join("\n").slice(0,2000),priority:item.priority ?? "medium",due_date:item.due_date,project_id:item.project_id,goal_id:item.goal_id,source:"ai_capture",document_import:{document_id:docId,index:row.index}}});
        count++;setRows((old) => old.map((r) => r.index===row.index ? {...r,selected:false,savedTitle:result.title} : r));
      } catch(e) { failures.push(`${item.title}: ${e instanceof Error ? e.message : "Could not save"}`); }
    }
    await qc.invalidateQueries();
    if(count) toast.success(`${count} task${count===1?"":"s"} saved or already imported`);
    if(failures.length) setError(failures.join("\n"));
  }
  return <div className="space-y-6">
    <h1 className="text-4xl font-semibold">Documents & meeting notes</h1>
    <div className="flex flex-wrap gap-2">{documents.map((d) => <Button key={d.id} className="h-auto max-w-full whitespace-normal break-words text-left" variant={docId===d.id?"secondary":"outline"} disabled={busy} onClick={() => run(() => load(d.id))}><FileText className="shrink-0" />{d.name}</Button>)}</div>
    <section className="space-y-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="doc-name">Source name</Label><Input id="doc-name" value={name} maxLength={200} disabled={busy} onChange={(e) => {setName(e.target.value);setDocId(null);}} /></div><div className="space-y-2"><Label htmlFor="doc-date">Reference date (optional)</Label><Input id="doc-date" type="date" value={reference} disabled={busy} onChange={(e) => {setReference(e.target.value);setDocId(null);}} /></div></div>
      <Label htmlFor="doc-text">Source text</Label><Textarea id="doc-text" value={text} maxLength={80000} className="min-h-40" disabled={busy} onChange={(e) => {setText(e.target.value);setDocId(null);setRows([]);setAnalysed(false);}} />
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="space-y-2"><Label htmlFor="doc-file" className="flex items-center gap-2"><Upload className="size-4" />Upload TXT, Markdown or PDF · up to 10 MB</Label><Input id="doc-file" type="file" accept=".txt,.md,.markdown,.pdf" disabled={busy} onChange={(e) => { const file=e.target.files?.[0];if(!file)return;run(async () => { const form=new FormData();form.append("file",file);form.append("reference_date",reference);const response=await authenticatedUpload("/api/documents",form);const result=await response.json();if(!response.ok)throw new Error(result.error);await load(result.id);await extract(result.id); });e.target.value=""; }} /></div><Button disabled={busy || text.trim().length<3 || !name.trim()} onClick={() => run(async () => {const d=docId ? {id:docId} : await paste({data:{name,text,reference_date:reference||null}});await extract(d.id);})}><Sparkles />{busy?"Processing…":"Extract action items"}</Button></div>
    </section>
    {error && <p role="alert" className="whitespace-pre-line text-sm text-destructive">{error}</p>}
    {analysed && !rows.length && <p className="text-muted-foreground">No supported action items found in this source.</p>}
    <div className="space-y-4">{rows.map((row) => <article key={row.index} className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-3"><Checkbox aria-label={`Select action ${row.index+1}`} checked={row.selected} disabled={busy||Boolean(row.savedTitle)} onCheckedChange={(v) => setRows((old)=>old.map((r)=>r.index===row.index?{...r,selected:v===true}:r))} /><span className="flex-1 text-sm font-semibold">{row.savedTitle ? `Saved: ${row.savedTitle}` : `Action ${row.index+1}`}</span><Button size="icon" variant="ghost" aria-label={`Remove action ${row.index+1}`} disabled={busy} onClick={() => setRows((old)=>old.filter((r)=>r.index!==row.index))}><Trash2 /></Button></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1 sm:col-span-2"><Label htmlFor={`item-title-${row.index}`}>Task title</Label><Input id={`item-title-${row.index}`} value={row.item.title} disabled={busy||Boolean(row.savedTitle)} onChange={(e)=>update(row.index,{title:e.target.value})} /></div><div className="space-y-1 sm:col-span-2"><Label htmlFor={`item-notes-${row.index}`}>Notes</Label><Textarea id={`item-notes-${row.index}`} value={row.item.description??""} disabled={busy||Boolean(row.savedTitle)} onChange={(e)=>update(row.index,{description:e.target.value||null})} /></div><div className="space-y-1"><Label htmlFor={`item-owner-${row.index}`}>Responsible person</Label><Input id={`item-owner-${row.index}`} value={row.item.responsible_person??""} disabled={busy||Boolean(row.savedTitle)} onChange={(e)=>update(row.index,{responsible_person:e.target.value||null})} /></div><div className="space-y-1"><Label htmlFor={`item-date-${row.index}`}>Due date</Label><Input id={`item-date-${row.index}`} type="date" value={row.item.due_date??""} disabled={busy||Boolean(row.savedTitle)} onChange={(e)=>update(row.index,{due_date:e.target.value||null})} /></div><div className="space-y-1"><Label htmlFor={`item-priority-${row.index}`}>Priority</Label><select id={`item-priority-${row.index}`} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={row.item.priority??""} disabled={busy||Boolean(row.savedTitle)} onChange={(e)=>update(row.index,{priority:(e.target.value||null) as DocumentCandidate["priority"]})}><option value="">Not stated (medium when saved)</option>{PRIORITIES.map((p)=><option key={p} value={p}>{p}</option>)}</select></div></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor={`item-project-${row.index}`}>Related project</Label><select id={`item-project-${row.index}`} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={row.item.project_id??""} disabled={busy||Boolean(row.savedTitle)} onChange={(e)=>update(row.index,{project_id:e.target.value||null})}><option value="">None</option>{projects.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor={`item-goal-${row.index}`}>Related goal</Label><select id={`item-goal-${row.index}`} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={row.item.goal_id??""} disabled={busy||Boolean(row.savedTitle)} onChange={(e)=>update(row.index,{goal_id:e.target.value||null})}><option value="">None</option>{goals.map((g)=><option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
      </div>
      <blockquote className="mt-4 break-words border-l-2 border-primary pl-3 text-sm text-muted-foreground">{row.item.evidence}</blockquote>{row.item.uncertainties.length>0&&<ul className="mt-2 break-words text-sm text-muted-foreground">{row.item.uncertainties.map((u,i)=><li key={i}>{u}</li>)}</ul>}
    </article>)}</div>
    {rows.length>0&&<div className="flex justify-end"><Button disabled={busy||!rows.some((r)=>r.selected&&!r.savedTitle)} onClick={()=>setConfirm(true)}><Check />Create selected tasks</Button></div>}
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Create selected tasks?</AlertDialogTitle><AlertDialogDescription>{rows.filter((r)=>r.selected&&!r.savedTitle).length} selected items will be saved to your task list. Previously imported items will not be duplicated.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>run(importSelected)}>Confirm import</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}