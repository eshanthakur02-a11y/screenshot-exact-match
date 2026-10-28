import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  Folder,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Target,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getShell } from "@/lib/data/workspace.functions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const shellQuery = queryOptions({ queryKey: ["shell"], queryFn: () => getShell() });

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const groups = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/tasks", label: "My Tasks", icon: ListTodo },
      { to: "/projects", label: "Projects", icon: Folder },
      { to: "/goals", label: "Goals", icon: Target },
      { to: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/review", label: "Weekly Review", icon: BookOpen },
      { to: "/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function initials(name: string | null, email: string) {
  const s = (name || email).trim();
  return s
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AppLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: shell } = useQuery(shellQuery);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const unread = shell?.unread ?? 0;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  function search(e: FormEvent) {
    e.preventDefault();
    navigate({ to: "/tasks", search: { q: q.trim() || undefined } });
  }

  const nav = (compact: boolean) => (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
      {groups.map((g) => (
        <div key={g.label}>
          {!compact && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">
              {g.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  title={compact ? label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    compact && "justify-center px-0",
                  )}
                  activeProps={{
                    className: "bg-gradient-brand !text-primary-foreground shadow-glow",
                  }}
                >
                  <Icon className="size-4 shrink-0" />
                  {!compact && <span className="flex-1">{label}</span>}
                  {!compact && to === "/notifications" && unread > 0 && (
                    <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const profile = (compact: boolean) => (
    <div
      className={cn(
        "mt-4 flex items-center gap-3 rounded-xl border border-sidebar-border p-2.5",
        compact && "justify-center border-0 p-0",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground">
        {initials(shell?.displayName ?? null, user.email ?? "?")}
      </span>
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{shell?.displayName ?? "Your account"}</p>
          <p className="truncate text-xs text-sidebar-foreground/55">{user.email}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground transition-[width] md:flex",
          collapsed ? "w-[76px]" : "w-[256px]",
        )}
      >
        <div
          className={cn("mb-8 flex items-center justify-between", collapsed && "justify-center")}
        >
          {!collapsed && (
            <Link to="/dashboard" className="font-display text-2xl font-semibold">
              Aether<span className="text-accent">Mind</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
        {nav(collapsed)}
        {profile(collapsed)}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex w-[270px] flex-col border-sidebar-border bg-sidebar p-4 text-sidebar-foreground"
        >
          <SheetTitle className="mb-6 font-display text-2xl">
            Aether<span className="text-accent">Mind</span>
          </SheetTitle>
          {nav(false)}
          {profile(false)}
        </SheetContent>
      </Sheet>

      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-hero" />
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl md:px-8">
          <button
            className="rounded-md p-2 md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <form onSubmit={search} className="relative max-w-md flex-1" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search tasks"
              placeholder="Search tasks…"
              className="h-10 w-full rounded-xl border border-input bg-card/60 pl-9 pr-3 text-sm outline-hidden placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-brand px-3 text-sm font-semibold text-primary-foreground shadow-glow hover:brightness-110">
                <Plus className="size-4" />
                <span className="hidden sm:inline">New</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/tasks", search: { new: true } })}
                >
                  Task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/projects", search: { new: true } })}
                >
                  Project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/goals", search: { new: true } })}
                >
                  Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              to="/notifications"
              aria-label={`Notifications, ${unread} unread`}
              className="relative rounded-xl border border-border p-2.5 hover:bg-secondary"
            >
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Profile menu"
                className="flex size-10 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground"
              >
                {initials(shell?.displayName ?? null, user.email ?? "?")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                  <Settings /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="relative mx-auto w-full max-w-7xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
