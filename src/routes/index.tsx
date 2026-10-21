import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AetherMind — Personal AI Chief of Staff" },
      { name: "description", content: "Say what needs doing. AetherMind turns it into organised, dated tasks." },
      { property: "og:title", content: "AetherMind — Personal AI Chief of Staff" },
      { property: "og:description", content: "Say what needs doing. AetherMind turns it into organised, dated tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <span className="font-display text-2xl">
          Aether<span className="text-accent">Mind</span>
        </span>
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-24 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Personal AI Chief of Staff
        </p>
        <h1 className="text-5xl leading-tight md:text-6xl">
          Say what needs doing.
          <br />
          <em className="text-accent">We'll keep it in order.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Type a sentence like "Finish my AI assignment by Friday, high priority, about three hours" and
          AetherMind turns it into a clear task you can review before saving.
        </p>
        <Button asChild size="lg" className="mt-10">
          <Link to="/auth">Get started</Link>
        </Button>
        <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-5 text-left shadow-soft">
          <p className="text-sm text-muted-foreground">"Call the bank tomorrow, urgent, 20 minutes"</p>
          <div className="mt-3 border-t pt-3">
            <p className="font-semibold">Call the bank</p>
            <p className="text-xs text-muted-foreground">Urgent · Due tomorrow · 20 min</p>
          </div>
        </div>
      </section>
    </div>
  );
}
