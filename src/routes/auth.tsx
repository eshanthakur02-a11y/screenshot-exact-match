import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { Chrome, Circle, Eye, EyeOff, Github } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Aurora Sign Up — AetherMind" },
      { name: "description", content: "Create your AetherMind account in three quick steps." },
      { property: "og:title", content: "Aurora Sign Up — AetherMind" },
      { property: "og:description", content: "Create your AetherMind account in three quick steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: AuthPage,
});

const stepVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const heroVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const name = [firstName, lastName].filter(Boolean).join(" ");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || undefined, first_name: firstName || undefined, last_name: lastName || undefined },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard" });
        else setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithProvider(provider: "google" | "github") {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Couldn't start ${provider} sign-in`);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-black p-4 font-aurora text-white">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md space-y-6 rounded-2xl bg-brand-gray p-10"
        >
          <div className="flex items-center gap-2">
            <Circle size={20} className="fill-white text-white" />
            <span className="text-xl font-semibold tracking-tight">Aurora</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-medium tracking-tight">Check your email</h1>
            <p className="text-sm leading-relaxed text-white/50">
              We sent a confirmation link to {email}. Open it to finalize your profile.
            </p>
          </div>
          <StepItem number="3" text="Finalize your profile" active />
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-sm text-white/60 hover:text-white"
          >
            Back to sign up
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full bg-black p-2 font-aurora text-white selection:bg-white/30 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4">
      {/* Left column — hero with background video */}
      <div className="relative hidden h-full w-[52%] flex-col items-center justify-end overflow-hidden rounded-3xl px-12 pb-32 shadow-2xl lg:flex">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4"
            type="video/mp4"
          />
        </video>
        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="show"
          className="z-10 w-full max-w-xs space-y-8"
        >
          <motion.div variants={stepVariants} className="flex items-center gap-2">
            <Circle size={20} className="fill-white text-white" />
            <span className="text-xl font-semibold tracking-tight">Aurora</span>
          </motion.div>
          <motion.div variants={stepVariants} className="space-y-3">
            <h1 className="whitespace-nowrap text-4xl font-medium tracking-tight">Join Aurora</h1>
            <p className="px-4 text-sm leading-relaxed text-white/60">
              Follow these 3 quick phases to activate your space.
            </p>
          </motion.div>
          <motion.div variants={stepVariants} className="space-y-3">
            <StepItem number="1" text="Register your identity" active />
            <StepItem number="2" text="Configure your studio" />
            <StepItem number="3" text="Finalize your profile" />
          </motion.div>
        </motion.div>
      </div>

      {/* Right column — form */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12 sm:px-12 lg:overflow-hidden lg:px-16 lg:py-6 xl:px-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-xl space-y-8 sm:space-y-10 lg:space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-medium tracking-tight">
              {mode === "signup" ? "Create New Profile" : "Welcome Back"}
            </h2>
            <p className="text-sm text-white/40">
              {mode === "signup"
                ? "Input your basic details to begin the journey."
                : "Sign in to continue where you left off."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SocialButton icon={<Chrome size={18} />} label="Google" onClick={() => signInWithProvider("google")} />
            <SocialButton icon={<Github size={18} />} label="Github" onClick={() => signInWithProvider("github")} />
          </div>

          <div className="relative flex items-center">
            <div className="w-full border-t border-white/10" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-black px-4 text-xs font-medium uppercase tracking-widest text-white/40">
              Or
            </span>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label="First Name"
                  placeholder="Jane"
                  type="text"
                  value={firstName}
                  onChange={setFirstName}
                />
                <InputGroup
                  label="Last Name"
                  placeholder="Doe"
                  type="text"
                  value={lastName}
                  onChange={setLastName}
                />
              </div>
            )}
            <InputGroup
              label="Email"
              placeholder="jane@aurora.studio"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <div className="space-y-1.5">
              <div className="relative">
                <InputGroup
                  label="Password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  className="pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-[38px] text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-white/30">Requires at least 8 symbols.</p>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-4 h-14 w-full rounded-xl bg-white font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create Account" : "Log In"}
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            {mode === "signup" ? (
              <>
                Member of the team?{" "}
                <button type="button" onClick={() => setMode("signin")} className="text-white underline-offset-4 hover:underline">
                  Log in
                </button>
              </>
            ) : (
              <>
                New to Aurora?{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-white underline-offset-4 hover:underline">
                  Create an account
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-white/25">
            <Link to="/" className="hover:text-white/60">
              Back to AetherMind home
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function StepItem({ number, text, active }: { number: string; text: string; active?: boolean }) {
  if (active) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-white bg-white px-4 py-2.5 text-black">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
          {number}
        </span>
        <span className="text-sm font-medium">{text}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-full border-none bg-brand-gray px-4 py-2.5 text-white">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/40">
        {number}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function SocialButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black text-sm font-medium text-white transition-colors hover:bg-white/5"
    >
      {icon}
      {label}
    </button>
  );
}

function InputGroup({
  label,
  placeholder,
  type,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-white">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`h-11 w-full rounded-xl border-none bg-brand-gray px-4 text-white outline-none placeholder:text-white/20 focus:ring-2 focus:ring-white/20 ${className ?? ""}`}
      />
    </div>
  );
}
