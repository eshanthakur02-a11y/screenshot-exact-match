import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/data/tasks.functions";
import { TaskCapture } from "@/components/task-capture";
import { TaskRow } from "@/components/task-row";

const dashboardQuery = queryOptions({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AetherMind" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const open = data.tasks.filter((t) => t.status !== "done");
  const now = Date.now();
  const overdue = open.filter((t) => t.due_date && new Date(t.due_date).getTime() < now - 12 * 3600e3);
  const week = open.filter(
    (t) => t.due_date && new Date(t.due_date).getTime() <= now + 7 * 864e5,
  );
  const doneCount = data.tasks.length - open.length;
  const minutes = open.reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);

  const stats = [
    { label: "Open tasks", value: open.length },
    { label: "Due this week", value: week.length },
    { label: "Overdue", value: overdue.length },
    { label: "Completed", value: doneCount },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-4xl">Hello{data.displayName ? `, ${data.displayName}` : ""}.</h1>
        {minutes > 0 && (
          <p className="mt-1 text-muted-foreground">
            About {Math.round(minutes / 6) / 10} hours of planned work is open.
          </p>
        )}
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="font-display text-3xl">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <TaskCapture />
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-2xl">Up next</h2>
          <Link to="/tasks" className="text-sm text-muted-foreground hover:text-foreground">
            All tasks →
          </Link>
        </div>
        {open.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Nothing open. Capture your first task above.
          </p>
        ) : (
          <ul className="space-y-2">
            {open.slice(0, 6).map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
