import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/data/workspace.functions";
import { saveReminderPreferences } from "@/lib/data/reminders.functions";
import { Switch } from "@/components/ui/switch";
import { shellQuery } from "./route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — AetherMind" }, { name: "description", content: "Your profile and preferences." }, { property: "og:title", content: "Settings — AetherMind" }, { property: "og:description", content: "Your profile and preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(shellQuery),
  component: SettingsPage,
});

const zones = (() => { try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone"); } catch { return ["UTC"]; } })();

function SettingsPage() {
  const { data: shell } = useSuspenseQuery(shellQuery);
  const { user } = Route.useRouteContext();
  const save = useServerFn(updateProfile);
  const saveReminders = useServerFn(saveReminderPreferences);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(shell.displayName ?? "");
  const [tz, setTz] = useState(shell.timezone);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(shell.remindersEnabled);
  const [days, setDays] = useState(shell.reminderDaysBefore);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await save({ data: { display_name: name, timezone: tz } }); toast.success("Settings saved"); qc.invalidateQueries(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
    finally { setBusy(false); }
  }
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-4xl font-semibold">Settings</h1>
      <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-sans text-lg font-semibold">Profile</h2>
        <div className="space-y-1.5"><Label>Email</Label><p className="text-sm text-muted-foreground">{user.email}</p></div>
        <div className="space-y-1.5"><Label htmlFor="s-name">Display name</Label><Input id="s-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="s-tz">Timezone</Label>
          <select id="s-tz" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={tz} onChange={(e) => setTz(e.target.value)}>
            {(zones.includes(tz) ? zones : [tz, ...zones]).map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Used for "due today", overdue and completed-today counts.
            {" "}<button type="button" className="underline" onClick={() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use this device's timezone</button></p>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={busy} className="bg-gradient-brand">{busy ? "Saving…" : "Save changes"}</Button></div>
      </form>
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="font-sans text-lg font-semibold">Deadline reminders</h2>
        <div className="flex items-center justify-between"><Label htmlFor="reminders">In-app reminders</Label><Switch id="reminders" checked={enabled} onCheckedChange={setEnabled} disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="reminder-days">Days before deadline</Label><Input id="reminder-days" type="number" min={0} max={7} value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={busy} /></div>
        <p className="text-xs text-muted-foreground">Checked hourly in your timezone. One upcoming reminder and one overdue reminder per deadline. No email or push delivery.</p>
        <Button variant="outline" disabled={busy || !Number.isInteger(days) || days<0 || days>7} onClick={async () => { setBusy(true);try { await saveReminders({data:{enabled,days_before:days}});await qc.invalidateQueries({queryKey:["shell"]});toast.success("Reminder preferences saved"); } catch(e) { toast.error(e instanceof Error ? e.message : "Could not save reminders"); } finally {setBusy(false);} }}>Save reminder preferences</Button>
      </section>
      <section className="glass rounded-2xl p-6">
        <h2 className="font-sans text-lg font-semibold">Account</h2>
        <Button variant="outline" className="mt-3" onClick={signOut}><LogOut /> Sign out</Button>
      </section>
    </div>
  );
}
