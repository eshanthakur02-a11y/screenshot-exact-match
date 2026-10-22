import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, BarChart3, Calendar, FileText, Folder,
  Menu, Sparkles, Target, X, Clock, Flag, Wand2,
} from "lucide-react";
import { HeroSpline } from "@/components/hero-spline";

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


  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section id="product" aria-label="AetherMind robot" className="relative h-dvh w-full overflow-hidden bg-scene-background">
        <HeroSpline />
      </section>

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

