"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Clapperboard,
  Film,
  FlaskConical,
  GraduationCap,
  Inbox,
  Layers,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark, Wordmark } from "@/components/shell/logo";
import { PlatformIcon } from "@/components/publishing/platform-icons";
import type { Platform } from "@/lib/types";
import { HeroVideo } from "./hero-video";
import { VideoRail } from "./video-wall";
import { VideoTile } from "./video-tile";
import { BatchScroll } from "./batch-scroll";
import { Counter } from "./counter";
import { SHOWCASE, rotate } from "./showcase-data";

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
    title: "Name a number",
    body: "“Give me three videos a day.” That's the entire brief — the system studies your brand, audience and voice, then plans the batch on its own.",
  },
  {
    icon: Inbox,
    step: "02",
    title: "Review, don't produce",
    body: "Finished videos land in your queue overnight. Swipe right to approve, swipe left to request changes in plain English. Ten minutes a day.",
  },
  {
    icon: GraduationCap,
    step: "03",
    title: "The loop compounds",
    body: "Every post feeds performance data back into the Brand Brain — so next week's batch opens stronger than this week's.",
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

const STATS = [
  { to: 100, suffix: "+", label: "clips per batch", decimals: 0 },
  { to: 11, suffix: "", label: "pipeline stages", decimals: 0 },
  { to: 10, suffix: " min", label: "of your day", decimals: 0 },
  { to: 24, suffix: "/7", label: "always producing", decimals: 0 },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const reveal = {
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: true, margin: "-80px" },
  variants: fadeUp,
};

export function LandingPage({ configured }: { configured: boolean }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-dvh overflow-clip bg-background">
      {/* ── Scroll progress rail ───────────────────────────────────────── */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-primary via-[oklch(0.72_0.16_300)] to-[oklch(0.74_0.14_250)]"
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between px-4 py-3 transition-all duration-300 sm:px-6 ${
            scrolled ? "sm:py-2.5" : ""
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </Link>
          <nav
            className={`glass hidden items-center gap-1 rounded-full border p-1 transition-colors md:flex ${
              scrolled ? "border-border/70" : "border-border/40"
            }`}
          >
            {[
              ["How it works", "#how-it-works"],
              ["The batch", "#batch"],
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
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
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
              Auto-batch AI video generation, running 24/7
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-7 text-balance text-[2.7rem] font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-[4.5rem]"
            >
              Generate a{" "}
              <span className="bg-gradient-to-br from-primary via-[oklch(0.72_0.16_300)] to-[oklch(0.74_0.14_250)] bg-clip-text text-transparent">
                week of video
              </span>
              <br className="hidden sm:block" /> in a single batch.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-6 max-w-xl text-balance text-[15.5px] leading-relaxed text-foreground/75 sm:text-lg"
            >
              Infinitents researches, scripts, renders, edits and publishes
              short- and long-form video — automatically, in batches. You don&apos;t
              manage AI. You manage outcomes.
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
                <a href="#batch">
                  <Play className="fill-current" /> Watch a batch
                </a>
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

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute inset-x-0 bottom-6 z-10 flex justify-center"
        >
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-foreground/20 p-1">
            <motion.span
              animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="size-1 rounded-full bg-foreground/60"
            />
          </div>
        </motion.div>
      </section>

      {/* ── Living showcase rail ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border/60 bg-black py-14 sm:py-16">
        <div className="mx-auto mb-9 max-w-6xl px-4 sm:px-6">
          <motion.div {...reveal} className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/70">
                <Film className="size-3.5 text-primary" /> Straight from the pipeline
              </span>
              <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Every clip below was generated, not filmed.
              </h2>
            </div>
            <p className="max-w-xs text-[13.5px] leading-relaxed text-white/55">
              A live sample of the output — hooks, B-roll and full scenes,
              rendered vertical and ready to post.
            </p>
          </motion.div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <VideoRail videos={rotate(SHOWCASE, 0)} direction="left" duration={55} />
          <VideoRail videos={rotate(SHOWCASE, 3)} direction="right" duration={68} showMeta />
        </div>
      </section>

      {/* ── Pinned batch scroll ────────────────────────────────────────── */}
      <div id="batch" className="scroll-mt-0">
        <BatchScroll />
      </div>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
        <motion.div {...reveal} className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[12px] font-medium text-muted-foreground">
            <Wand2 className="size-3.5 text-primary" /> How it works
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            You act as editor-in-chief.
            <br />
            <span className="text-muted-foreground">Not content creator.</span>
          </h2>
        </motion.div>

        <div className="relative mt-14">
          {/* connective line drawing in */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[2.75rem] hidden h-px origin-left bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="card-hover relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6"
              >
                <span className="absolute right-5 top-4 text-[40px] font-semibold tracking-tight text-foreground/[0.06] tnum">
                  {s.step}
                </span>
                <div className="relative flex size-11 items-center justify-center rounded-xl bg-primary/12 ring-4 ring-background">
                  <s.icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats band ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border/60 bg-sidebar/50">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              "radial-gradient(60% 120% at 50% 0%, color-mix(in oklch, var(--color-primary) 12%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-4xl font-semibold tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                  <Counter to={s.to} suffix={s.suffix} decimals={s.decimals} />
                </span>
              </div>
              <p className="mt-2 text-[12.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ───────────────────────────────────────────────────── */}
      <section id="pipeline" className="relative scroll-mt-24 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...reveal} className="mx-auto max-w-xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[12px] font-medium text-muted-foreground">
              <Zap className="size-3.5 text-primary" /> The loop
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">One unbroken loop</h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
              Eleven pipeline stages run end-to-end — and the analytics feed back into the ideas,
              so the system gets sharper with every post.
            </p>
          </motion.div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2"
              >
                <div className="card-hover flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
                  <step.icon className="size-4 text-primary" />
                  <span className="text-[13px] font-medium">{step.label}</span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="size-3.5 text-muted-foreground/50" />
                )}
              </motion.div>
            ))}
          </div>
          <motion.p {...reveal} className="mt-8 text-center text-[12.5px] text-muted-foreground">
            Approve in one swipe. Everything else is automatic.
          </motion.p>
        </div>
      </section>

      {/* ── Features bento ─────────────────────────────────────────────── */}
      <section id="platform" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
        <motion.div {...reveal} className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[12px] font-medium text-muted-foreground">
            <Layers className="size-3.5 text-primary" /> The platform
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            A full department, not a tool
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
            Built for creators, agencies and marketing teams who need volume without losing the brand.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* feature list — spans two columns */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
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

          {/* live output card */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-2 items-center justify-center">
                  <span className="absolute size-2 animate-ping rounded-full bg-success/70" />
                  <span className="size-2 rounded-full bg-success" />
                </span>
                <span className="text-[12.5px] font-medium">Queue · live</span>
              </div>
              <span className="text-[11px] text-muted-foreground">rendering</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {rotate(SHOWCASE, 5)
                .slice(0, 2)
                .map((v, i) => (
                  <VideoTile
                    key={v.id}
                    video={v}
                    priority={i === 0}
                    showMeta
                    rounded="rounded-xl"
                  />
                ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
              Fresh renders drop into your queue while you sleep. Approve the
              keepers with a swipe.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <motion.div
          {...reveal}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-primary/25 px-6 py-20 text-center sm:px-12"
          style={{
            background:
              "radial-gradient(110% 140% at 50% 0%, color-mix(in oklch, var(--color-primary) 16%, var(--color-card)) 0%, var(--color-card) 60%)",
          }}
        >
          <div
            aria-hidden
            className="conic-glow animate-spin-slow pointer-events-none absolute -top-40 left-1/2 h-80 w-[560px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          />
          <div className="relative">
            <span className="glass inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-[12px] font-medium text-foreground/70">
              <Sparkles className="size-3.5 text-primary" /> One line of setup
            </span>
            <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              “Give me three videos a day.”
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
              That&apos;s the whole setup. Your first batch is waiting tomorrow morning.
            </p>
            <div className="mt-9">
              <Button size="lg" asChild disabled={!configured} className="h-12 rounded-full px-7 text-[15px]">
                <Link href={configured ? "/login?mode=signup" : "#how-it-works"}>
                  Launch your content department <ArrowRight />
                </Link>
              </Button>
            </div>
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
