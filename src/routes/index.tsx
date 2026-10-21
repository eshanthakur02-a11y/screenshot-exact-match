import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, BarChart3, Calendar, CheckCircle2, FileText, Folder, LayoutDashboard,
  Menu, Search, Sparkles, Target, X, Bell, Clock, Flag, Wand2, ListChecks, Brain, BookOpen,
} from "lucide-react";
import heroOrb from "@/assets/hero-orb.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AetherMind — Personal AI Chief of Staff" },
      { name: "description", content: "Turn everyday thoughts, tasks and commitments into a clear plan with AetherMind." },
      { property: "og:title", content: "AetherMind — Personal AI Chief of Staff" },
      { property: "og:description", content: "Say what needs doing. AetherMind turns it into organised, dated tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

const FEATURES = [
  { icon: Sparkles, title: "AI Task Capture", text: "Turn natural language into structured, actionable tasks with smart priority detection." },
  { icon: Folder, title: "Project Management", text: "Organize your work, track progress, and keep everything in one place." },
  { icon: Target, title: "Goal Planning", text: "Break big goals into achievable milestones with AI-powered suggestions." },
  { icon: Calendar, title: "Smart Calendar", text: "See your deadlines, meetings, and priorities in a beautiful timeline view." },
  { icon: BarChart3, title: "Weekly Reviews", text: "Get AI-powered insights on your progress and plan what's next." },
  { icon: FileText, title: "Document Intelligence", text: "Extract tasks and commitments from your documents and meetings." },
];

function Logo({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      Aether<span className="text-accent">Mind</span>
    </span>
  );
}

function PrimaryLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Link
      to="/auth"
      className={`inline-flex items-center gap-2 rounded-xl bg-gradient-brand font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}

function Landing() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const fade = (d = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Nav */}
      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-8 text-sm text-foreground/85 lg:flex">
          {NAV.map((n) => <a key={n.href} href={n.href} className="transition hover:text-foreground">{n.label}</a>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/auth" className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-secondary">Sign in</Link>
          <PrimaryLink className="px-5 py-2.5 text-sm">Get started <ArrowRight className="h-4 w-4" /></PrimaryLink>
        </div>
        <button aria-label={open ? "Close menu" : "Open menu"} className="rounded-lg border border-border p-2 lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {open && (
          <div className="glass absolute inset-x-4 top-full flex flex-col gap-1 rounded-2xl p-4 lg:hidden">
            {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-secondary">{n.label}</a>)}
            <Link to="/auth" className="rounded-lg px-3 py-2.5 hover:bg-secondary">Sign in</Link>
            <PrimaryLink className="mt-2 justify-center px-5 py-3 text-sm">Get started <ArrowRight className="h-4 w-4" /></PrimaryLink>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="product" className="relative">
        <div className="pointer-events-none absolute inset-0 -top-24">
          <img src={heroOrb} alt="" width={1600} height={1104} className="absolute right-0 top-0 h-full w-full object-cover object-top opacity-70 lg:w-[70%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 md:px-8 lg:grid-cols-[1fr_1.15fr] lg:pt-14">
          <div>
            <motion.div {...fade(0)} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
              <span className="h-2 w-2 rounded-full bg-primary shadow-glow" /> Personal AI Chief of Staff
            </motion.div>
            <motion.h1 {...fade(0.1)} className="mt-6 text-5xl font-semibold leading-[0.98] sm:text-6xl xl:text-7xl">
              Say what<br />needs doing.<br />
              <em className="text-gradient pr-2">We'll keep it in order.</em>
            </motion.h1>
            <motion.p {...fade(0.2)} className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Turn everyday thoughts, tasks, and commitments into a clear plan. AetherMind helps you capture priorities, organize projects, and achieve what matters most.
            </motion.p>
            <motion.div {...fade(0.3)} className="mt-8 flex flex-wrap gap-4">
              <PrimaryLink className="px-7 py-4">Get started <ArrowRight className="h-4 w-4" /></PrimaryLink>
              <a href="#how" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/40 px-7 py-4 font-medium transition hover:bg-secondary">
                See how it works
              </a>
            </motion.div>
            <motion.p {...fade(0.4)} className="mt-6 text-sm text-muted-foreground">Built for students, creators and professionals.</motion.p>
            <motion.dl {...fade(0.5)} className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-border">
              {[["Seconds", "From thought to task"], ["You decide", "Review before saving"], ["Private", "Only you see your data"]].map(([v, l]) => (
                <div key={l} className="px-4 first:pl-0">
                  <dt className="font-display text-2xl font-semibold">{v}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div {...fade(0.25)} className="relative">
            <Laptop />
            <div className="absolute -right-2 bottom-6 hidden w-[30%] sm:block lg:-right-6"><Phone /></div>
            <Link to="/auth" className="glass group absolute -bottom-10 right-4 hidden max-w-sm items-center gap-4 rounded-2xl p-4 shadow-glow transition hover:-translate-y-1 md:flex">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-brand"><Sparkles className="h-6 w-6 text-accent" /></span>
              <span>
                <span className="block font-semibold">AI Task Capture</span>
                <span className="block text-sm text-muted-foreground">Turn your thoughts into structured, actionable tasks with AI.</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pt-10 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Everything in one workspace</p>
          <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4 text-lg text-foreground/70">
            {[[ListChecks, "Tasks"], [Folder, "Projects"], [Target, "Goals"], [Calendar, "Calendar"], [Brain, "AI Workspace"], [BookOpen, "Weekly Review"]].map(([I, l]) => {
              const Icon = I as typeof Folder;
              return <span key={l as string} className="inline-flex items-center gap-2"><Icon className="h-5 w-5" />{l as string}</span>;
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-background-2 p-8 shadow-glow md:p-12">
          <div className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-2/3 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[0.9fr_2fr]">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em]"><span className="h-2 w-2 rounded-full bg-primary" />Powerful features</p>
              <h2 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">A complete productivity system <em className="text-gradient">powered by AI.</em></h2>
              <p className="mt-5 text-muted-foreground">Everything you need to capture, organize, and achieve what matters.</p>
              <a href="#how" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium transition hover:bg-secondary">Explore how it works <ArrowRight className="h-4 w-4" /></a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }, i) => (
                <motion.div key={title} initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="group flex flex-col rounded-2xl border border-border bg-card/60 p-5 transition hover:-translate-y-1 hover:border-primary/40">
                  <Icon className="h-7 w-7 text-accent" />
                  <h3 className="mt-4 font-sans text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{text}</p>
                  <ArrowRight className="mt-3 h-4 w-4 self-end text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2">
        <div>
          <h2 className="text-4xl font-semibold leading-tight md:text-5xl">From thought to action <em className="text-gradient">in seconds.</em></h2>
          <p className="mt-5 max-w-md text-muted-foreground">Simply tell AetherMind what you need to do, and it turns your thoughts into structured tasks, projects, and plans.</p>
          <ol className="mt-10 space-y-6">
            {[["Tell what needs doing", "Type a task, idea, or goal in natural language."],
              ["Review and refine", "AI extracts the details for you to review and edit before saving."],
              ["Stay organized", "Manage everything in one organized workspace."]].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand font-semibold">{i + 1}</span>
                <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="glass rounded-3xl p-6 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Example</p>
          <div className="mt-3 rounded-xl border border-border bg-background/60 p-4 text-sm">"Finish my Generative AI assignment by Friday, high priority, about three hours"</div>
          <div className="my-4 flex items-center gap-2 text-sm text-primary"><Wand2 className="h-4 w-4" /> Read with AI</div>
          <div className="rounded-xl border border-primary/30 bg-card p-4">
            <p className="font-semibold">Complete my Generative AI assignment</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-priority-high/15 px-2.5 py-1 text-priority-high"><Flag className="h-3 w-3" />High</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1"><Calendar className="h-3 w-3" />Friday</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1"><Clock className="h-3 w-3" />3 hours</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Illustration only. Sign in to capture your own tasks — nothing saves until you confirm.</p>
          <PrimaryLink className="mt-4 w-full justify-center px-5 py-3 text-sm">Try it with your tasks <ArrowRight className="h-4 w-4" /></PrimaryLink>
        </div>
      </section>

      {/* Pricing / About */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="glass rounded-3xl p-8 text-center md:p-12">
          <h2 className="text-3xl font-semibold md:text-4xl">Free while in early access</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Create an account and start capturing tasks today. Paid plans aren't available yet.</p>
          <PrimaryLink className="mt-6 px-7 py-3.5">Create your account <ArrowRight className="h-4 w-4" /></PrimaryLink>
        </div>
      </section>

      <footer id="about" className="mx-auto flex max-w-7xl flex-col justify-between gap-4 border-t border-border px-5 py-10 text-sm text-muted-foreground md:flex-row md:px-8">
        <div><Logo className="text-xl text-foreground" /><p className="mt-2 max-w-sm">Your personal AI chief of staff — capture, organize and follow through.</p></div>
        <p>© {new Date().getFullYear()} AetherMind</p>
      </footer>
    </div>
  );
}

/* ---------- Illustrative device previews (marketing only, not user data) ---------- */

const PRIORITIES: [string, string][] = [["Complete AI assignment", "High"], ["Prepare project presentation", "High"], ["Review research paper", "Medium"], ["Plan next week", "Low"]];
const tone: Record<string, string> = { High: "bg-priority-high/20 text-priority-high", Medium: "bg-priority-medium/20 text-priority-medium", Low: "bg-priority-low/20 text-priority-low" };

function Laptop() {
  return (
    <div className="mx-auto w-full max-w-[720px]" aria-label="Illustrative AetherMind dashboard preview">
      <div className="rounded-t-2xl border border-border bg-background p-2 shadow-glow">
        <div className="flex overflow-hidden rounded-lg bg-background-2 text-[9px] sm:text-[10px]">
          <aside className="hidden w-[22%] flex-col gap-1.5 border-r border-border p-3 sm:flex">
            <Logo className="mb-2 text-sm" />
            {[LayoutDashboard, ListChecks, Folder, Target, Calendar, Brain, BookOpen, FileText, BarChart3].map((I, i) => (
              <span key={i} className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${i === 0 ? "bg-primary/25" : "text-muted-foreground"}`}>
                <I className="h-3 w-3" />{["Dashboard", "Tasks", "Projects", "Goals", "Calendar", "AI Workspace", "Weekly Review", "Documents", "Insights"][i]}
              </span>
            ))}
          </aside>
          <div className="flex-1 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex flex-1 items-center gap-1 rounded-md bg-card px-2 py-1 text-muted-foreground"><Search className="h-3 w-3" />Search anything…</span>
              <Bell className="h-3 w-3" /><span className="h-5 w-5 rounded-full bg-gradient-brand" />
            </div>
            <p className="mt-3 font-display text-sm font-semibold sm:text-base">Good morning 👋</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[["12", "Open", "text-foreground"], ["3", "Due today", "text-magenta"], ["2", "Overdue", "text-priority-high"], ["8", "Done", "text-success"]].map(([n, l, c]) => (
                <div key={l} className="rounded-md border border-border bg-card p-2"><p className={`text-base font-semibold ${c}`}>{n}</p><p className="text-muted-foreground">{l}</p></div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border bg-card p-2">
                <p className="mb-1.5 font-semibold">Today's priorities</p>
                {PRIORITIES.map(([t, p]) => (
                  <div key={t} className="flex items-center justify-between py-0.5"><span className="flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-muted-foreground" />{t}</span><span className={`rounded px-1 ${tone[p]}`}>{p}</span></div>
                ))}
              </div>
              <div className="rounded-md border border-border bg-card p-2">
                <p className="mb-1.5 font-semibold">Weekly progress</p>
                <div className="flex h-14 items-end gap-1">
                  {[30, 45, 40, 60, 75, 50, 35].map((h, i) => <span key={i} className="flex-1 rounded-sm bg-gradient-brand" style={{ height: `${h}%`, opacity: i > 4 ? 0.4 : 1 }} />)}
                </div>
              </div>
              <div className="col-span-2 rounded-md border border-border bg-card p-2">
                <p className="mb-1.5 font-semibold">Active projects</p>
                {[["Generative AI Portfolio", 66], ["College Projects", 50], ["Personal Growth", 33]].map(([t, v]) => (
                  <div key={t} className="flex items-center gap-2 py-0.5"><span className="w-1/3 truncate">{t}</span><span className="h-1 flex-1 rounded-full bg-muted"><span className="block h-1 rounded-full bg-gradient-brand" style={{ width: `${v}%` }} /></span><span>{v}%</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b-2xl border border-border bg-gradient-to-b from-muted to-background" />
    </div>
  );
}

function Phone() {
  return (
    <div className="animate-float rounded-[1.6rem] border-2 border-primary/40 bg-background p-1.5 shadow-glow">
      <div className="rounded-[1.3rem] bg-background-2 p-2.5 text-[8px]">
        <p className="font-display text-xs font-semibold">Good morning 👋</p>
        <div className="mt-2 flex gap-1"><span className="rounded-full bg-magenta/30 px-2 py-0.5">Today</span><span className="rounded-full bg-card px-2 py-0.5">Upcoming</span></div>
        <div className="mt-2 space-y-1">
          {PRIORITIES.map(([t, p]) => (
            <div key={t} className="flex items-center justify-between rounded-md bg-card px-1.5 py-1"><span className="truncate">{t}</span><span className={`rounded px-1 ${tone[p]}`}>{p}</span></div>
          ))}
        </div>
        <div className="mt-2 flex justify-end"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">+</span></div>
      </div>
    </div>
  );
}
