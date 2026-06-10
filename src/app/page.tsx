import Link from "next/link";
import { ArrowRight, BarChart3, Brain, Clapperboard, Sparkles, Send, ShieldCheck } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const PIPELINE = [
  { icon: Brain, label: "Brand Brain" },
  { icon: Sparkles, label: "Viral Ideas" },
  { icon: ShieldCheck, label: "Scripts + Audit" },
  { icon: Clapperboard, label: "Video + Edit" },
  { icon: Send, label: "Publish" },
  { icon: BarChart3, label: "Learn" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-300px] mx-auto h-[600px] max-w-3xl rounded-full opacity-25 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.55 0.2 285), oklch(0.6 0.18 250), transparent)",
        }}
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <Wordmark />
        </div>
        <div className="flex items-center gap-2">
          {configured ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login?mode=signup">
                  Get started <ArrowRight />
                </Link>
              </Button>
            </>
          ) : (
            <span className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1 text-[12px] font-medium text-warning">
              Connect Supabase to begin — see README
            </span>
          )}
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center pb-20 pt-20 text-center sm:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Your content department, working 24/7
          </div>

          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            The Operating System for <span className="text-gradient">Content Growth</span>
          </h1>
          <p className="mt-6 max-w-xl text-balance text-[15.5px] leading-relaxed text-muted-foreground sm:text-lg">
            Infinitents researches, plans, generates, edits, publishes and learns from short-form
            content — automatically. You don&apos;t manage AI. You manage outcomes.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" asChild disabled={!configured}>
              <Link href={configured ? "/login?mode=signup" : "#setup"}>
                Give me videos every day <ArrowRight />
              </Link>
            </Button>
            <span className="text-[12.5px] text-muted-foreground">
              You act as editor-in-chief. Not content creator.
            </span>
          </div>

          {/* pipeline strip */}
          <div className="mt-20 w-full">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-2 gap-y-4">
              {PIPELINE.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
                    <step.icon className="size-4 text-primary" />
                    <span className="text-[13px] font-medium">{step.label}</span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="size-3.5 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
              Approve in one swipe. Everything else is automatic — and it gets smarter with every post.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border/60 py-8 text-center text-[12.5px] text-muted-foreground">
        Infinitents — videos approved and published is the only metric that matters.
      </footer>
    </div>
  );
}
