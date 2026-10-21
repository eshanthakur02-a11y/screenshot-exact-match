import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ListTodo, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
] as const;

function AppLayout() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_1fr]">
      <aside className="flex flex-col bg-sidebar p-5 text-sidebar-foreground md:min-h-screen">
        <Link to="/dashboard" className="mb-8 font-display text-2xl text-sidebar-foreground">
          Aether<span className="text-sidebar-primary">Mind</span>
        </Link>
        <nav className="flex gap-1 md:flex-col">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden pt-8 md:block">
          <p className="mb-2 truncate text-xs text-sidebar-foreground/60">{user.email}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl p-6 md:p-10">
        <Outlet />
        <Button variant="outline" size="sm" onClick={signOut} className="mt-10 md:hidden">
          <LogOut /> Sign out
        </Button>
      </main>
    </div>
  );
}
