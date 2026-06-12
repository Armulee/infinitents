"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Clapperboard,
  FlaskConical,
  GraduationCap,
  Inbox,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/shell/logo";
import { PlatformIcon } from "@/components/publishing/platform-icons";
import type { Platform } from "@/lib/types";
import { HeroVideo } from "./hero-video";

const PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "facebook"];

const PIPELINE = [
  { icon: Brain, label: "Brand Brain" },
  { icon: Sparkles, label: "Viral Ideas" },
  { icon: ShieldCheck, label: "Scripts + Audit" },
  { icon: Clapperboard, label: "Video + Edit" },
  { icon: Send, label: "Publish" },
  { icon: BarChart3, label: "Learn" },
];

const STEPS = [
  {
    icon: Target,
    step: "01",
    title: "Set the outcome",
    body: "Tell the system how many videos you want per day. That's the entire brief — it studies your brand, audience and voice on its own.",
  },
  {
    icon: Inbox,
    step: "02",
    title: "Review, don't produce",
    body: "Finished videos land in your queue. Swipe right to approve, swipe left to request changes in plain English. Ten minutes a day.",
  },
  {
    icon: GraduationCap,
    step: "03",
    title: "The loop compounds",
    body: "Every post feeds performance data back into the Brand Brain — so next week's ideas open stronger than this week's.",
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Brand Brain",
    body: "Positioning, personas, voice and content pillars extracted automatically — and sharpened by every post's results.",
  },
  {
    icon: FlaskConical,
    title: "Viral Lab",
    body: "Hypothesis-driven ideas with hooks, emotional triggers and predicted scores. Produce the winners in one click.",
  },
  {
    icon: ShieldCheck,
    title: "Audit Agent",
    body: "Platform safety, copyright and brand alignment checked before a single frame renders. Only approved scripts continue.",
  },
  {
    icon: Clapperboard,
    title: "Studio + AI Editor",
    body: "A CapCut-simple editor where “make the intro stronger” is a complete instruction. The AI edits the timeline directly.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
} as const;

export function LandingPage({ configured }: { configured: boolean }) {
  return (
    <div className="relative min-h-dvh bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </Link>
          <nav className="glass hidden items-center gap-1 rounded-full border border-border/60 p-1 md:flex">
            {[
              ["How it works", "#how-it-works"],
              ["Pipeline", "#pipeline"],
              ["Platform", "#platform"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {configured ? (
              <>
                <Button variant="ghost" size="sm" asChild className="glass rounded-full">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild className="rounded-full">
                  <Link href="/login?mode=signup">
                    Get started <ArrowRight />
                  </Link>
                </Button>
              </>
            ) : (
              <span className="glass rounded-full border border-warning/30 px-3 py-1.5 text-[12px] font-medium text-warning">
                Connect Supabase to begin — see README
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[94dvh] items-center overflow-hidden">
        <HeroVideo />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-32 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="glass inline-flex items-center gap-2 rounded-full border border-border/60 px-3.5 py-1.5 text-[12.5px] font-medium text-foreground/80"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Your content department, working 24/7
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-7 text-balance text-[2.65rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]"
            >
              The Operating System for{" "}
              <span className="bg-gradient-to-br from-primary via-[oklch(0.7_0.16_300)] to-[oklch(0.72_0.14_250)] bg-clip-text text-transparent">
                Content Growth
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-6 max-w-xl text-balance text-[15.5px] leading-relaxed text-foreground/75 sm:text-lg"
            >
              Infinitents researches, plans, generates, edits, publishes and learns from
              short-form content — automatically. You don&apos;t manage AI. You manage outcomes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                asChild
                disabled={!configured}
                className="h-12 rounded-full px-7 text-[15px] shadow-[0_12px_40px_-12px_color-mix(in_oklch,var(--color-primary)_70%,transparent)]"
              >
                <Link href={configured ? "/login?mode=signup" : "#how-it-works"}>
                  Give me videos every day <ArrowRight />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="glass h-12 rounded-full border border-border/60 px-6"
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-14 flex flex-col items-center gap-3"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50">
                Publishes natively to
              </span>
              <div className="glass flex items-center gap-6 rounded-2xl border border-border/60 px-6 py-3.5">
                {PLATFORMS.map((p) => (
                  <PlatformIcon
                    key={p}
                    platform={p}
                    className="size-5 opacity-80 saturate-[0.85] transition-all hover:opacity-100 hover:saturate-100"
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            You act as editor-in-chief.
            <br />
            <span className="text-muted-foreground">Not content creator.</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card-hover relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6"
            >
              <span className="absolute right-5 top-4 text-[40px] font-semibold tracking-tight text-foreground/[0.06] tnum">
                {s.step}
              </span>
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12">
                <s.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ───────────────────────────────────────────────────── */}
      <section id="pipeline" className="relative scroll-mt-24 border-y border-border/60 bg-sidebar/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">One unbroken loop</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
              Eleven pipeline stages run end-to-end — and the analytics feed back into the ideas,
              so the system gets sharper with every post.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-4"
          >
            {PIPELINE.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="card-hover flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
                  <step.icon className="size-4 text-primary" />
                  <span className="text-[13px] font-medium">{step.label}</span>
                </div>
                {i < PIPELINE.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground/50" />}
              </div>
            ))}
          </motion.div>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-8 text-center text-[12.5px] text-muted-foreground"
          >
            Approve in one swipe. Everything else is automatic.
          </motion.p>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="platform" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A full department, not a tool
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            Built for creators, agencies and marketing teams who need volume without losing the brand.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="card-hover group rounded-2xl border border-border/80 bg-card p-6"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/12">
                <f.icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl border border-primary/25 px-6 py-16 text-center sm:px-12"
          style={{
            background:
              "radial-gradient(110% 140% at 50% 0%, color-mix(in oklch, var(--color-primary) 16%, var(--color-card)) 0%, var(--color-card) 60%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[480px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(closest-side, var(--color-primary), transparent)" }}
          />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            “Give me three videos a day.”
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
            That&apos;s the whole setup. Your queue fills tomorrow morning.
          </p>
          <div className="relative mt-8">
            <Button size="lg" asChild disabled={!configured} className="h-12 rounded-full px-7 text-[15px]">
              <Link href={configured ? "/login?mode=signup" : "#how-it-works"}>
                Launch your content department <ArrowRight />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="text-[13px] font-medium text-muted-foreground">Infinitents</span>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Videos approved and published — the only metric that matters.
          </p>
        </div>
      </footer>
    </div>
  );
}
