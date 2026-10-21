import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check, X } from "lucide-react";
import { toast } from "sonner";
import { deleteNotification, listNotifications, markNotifications } from "@/lib/data/workspace.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const notesQuery = queryOptions({ queryKey: ["notifications"], queryFn: () => listNotifications() });

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — AetherMind" }, { name: "description", content: "Your in-app notifications." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQuery),
  errorComponent: ({ error }) => <p role="alert" className="text-destructive">{error.message}</p>,
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data } = useSuspenseQuery(notesQuery);
  const qc = useQueryClient();
  const mark = useServerFn(markNotifications);
  const dismiss = useServerFn(deleteNotification);
  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["shell"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
  };
  const unread = data.filter((n) => !n.read_at).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl font-semibold">Notifications</h1><p className="text-muted-foreground">In-app only — nothing is sent by email or push.</p></div>
        {unread > 0 && <Button variant="outline" onClick={() => act(() => mark({ data: {} }))}><Check /> Mark all as read</Button>}
      </div>
      {data.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center"><Bell className="mx-auto size-8 text-accent" /><p className="mt-3 font-semibold">You're all caught up</p><p className="text-sm text-muted-foreground">Notifications will appear here.</p></div>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id} className={cn("glass flex items-start gap-3 rounded-xl p-4", !n.read_at && "border-primary/40")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-muted" : "bg-primary")} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read_at && <Button size="sm" variant="ghost" onClick={() => act(() => mark({ data: { id: n.id } }))}>Mark read</Button>}
              <Button size="icon" variant="ghost" aria-label="Dismiss" onClick={() => act(() => dismiss({ data: { id: n.id } }))}><X /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
