"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/publishing/platform-icons";
import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/types";
import { VideoTile } from "./video-tile";
import { Typewriter } from "./typewriter";
import { SHOWCASE, type ShowcaseVideo } from "./showcase-data";

const PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "facebook"];
const EASE = [0.22, 1, 0.36, 1] as const;
// Rotated by the hero typewriter — each fits "Generate a ___ in a single batch."
const TYPE_WORDS = [
  "week of video",
  "month of Reels",
  "week of TikToks",
  "month of Shorts",
  "week of ads",
];

// 5 columns, each a distinct trio → ~15 unique tiles, opposing drift.
const COLUMNS: {
  videos: ShowcaseVideo[];
  direction: "up" | "down";
  duration: number;
}[] = [
  { videos: [SHOWCASE[0], SHOWCASE[5], SHOWCASE[2]], direction: "up", duration: 46 },
  { videos: [SHOWCASE[3], SHOWCASE[1], SHOWCASE[6]], direction: "down", duration: 54 },
  { videos: [SHOWCASE[4], SHOWCASE[0], SHOWCASE[3]], direction: "up", duration: 50 },
  { videos: [SHOWCASE[6], SHOWCASE[2], SHOWCASE[5]], direction: "down", duration: 58 },
  { videos: [SHOWCASE[1], SHOWCASE[4], SHOWCASE[0]], direction: "up", duration: 52 },
];

function VerticalColumn({
  videos,
  direction,
  duration,
}: {
  videos: ShowcaseVideo[];
  direction: "up" | "down";
  duration: number;
}) {
  return (
    <div className="marquee-group h-full overflow-hidden">
      <div
        className={cn(
          "marquee-track marquee-anim flex-col gap-3",
          direction === "up" ? "animate-marquee-y" : "animate-marquee-y-rev",
        )}
        style={{ animationDuration: `${duration}s` }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex flex-col gap-3 pb-3">
            {videos.map((v) => (
              <VideoTile
                key={`${copy}-${v.id}`}
                video={v}
                showMeta={false}
                still={copy === 1}
                rounded="rounded-xl"
                className="w-full"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Number that scrubs with a motion value. */
function Scrub({ value }: { value: MotionValue<number> }) {
  const [n, setN] = useState(0);
  useMotionValueEvent(value, "change", (v) => setN(Math.round(v)));
  return <span className="tnum">{n}</span>;
}

function StageDots({ progress }: { progress: MotionValue<number> }) {
  const [active, setActive] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    setActive(v < 0.24 ? 0 : v < 0.46 ? 1 : v < 0.66 ? 2 : 3);
  });
  const labels = ["Wall", "Brief", "Batch", "Publish"];
  return (
    <div className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 sm:right-6 lg:flex">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center justify-end gap-2.5">
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.14em] transition-colors duration-300",
              i === active ? "text-foreground/80" : "text-foreground/25",
            )}
          >
            {l}
          </span>
          <span
            className={cn(
              "size-1.5 rounded-full transition-all duration-300",
              i === active
                ? "bg-primary shadow-[0_0_10px_2px_color-mix(in_oklch,var(--color-primary)_65%,transparent)]"
                : "bg-foreground/20",
            )}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Pinned scrollytelling hero.
 *
 * The section is tall; its inner panel sticks to the viewport while the page
 * scrolls, and that single scroll progress drives everything:
 *   • the tilted video wall zooms out, straightens and recedes,
 *   • the headline assembles line by line,
 *   • a live "batch" counter climbs while a render bar fills,
 *   • the sub-copy, CTAs and platform strip settle in,
 *   • then the whole stage lifts and fades, handing off to the page.
 *
 * Reduced-motion users get a calm, static hero (no pin, no scrubbing).
 */
export function HeroScroll({ configured }: { configured: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const p = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.0005,
  });

  // ── Wall — zooms out & straightens, then recedes and fades ───────────────
  const wallScale = useTransform(p, [0, 0.55, 1], [1.22, 1.0, 1.16]);
  const wallY = useTransform(p, [0, 1], ["2%", "-15%"]);
  const wallRotateX = useTransform(p, [0, 0.55, 1], [12, 4, 2]);
  const wallOpacity = useTransform(p, [0, 0.5, 0.82, 1], [1, 1, 0.6, 0.16]);
  const auroraOpacity = useTransform(p, [0, 0.5, 1], [0.3, 0.5, 0.12]);
  const poolOpacity = useTransform(p, [0, 0.8, 1], [1, 1, 0.4]);

  // ── Center content — loads in on arrival, lifts & fades out on scroll ────
  // The hero is complete the instant you land; scrolling drives the wall,
  // the batch counter and this cinematic exit hand-off to the page.
  const contentY = useTransform(p, [0, 0.72, 1], [0, 0, -96]);
  const contentO = useTransform(p, [0, 0.68, 0.92], [1, 1, 0]);
  const contentScale = useTransform(p, [0, 0.72, 1], [1, 1, 0.93]);

  // ── Batch HUD — the scroll payoff: clips climb, render bar fills ─────────
  const count = useTransform(p, [0.05, 0.92], [0, 124]);
  const barW = useTransform(p, [0.03, 0.96], ["0%", "100%"]);
  const hudO = useTransform(p, [0.08, 0.18, 0.9, 1], [0, 1, 1, 0]);
  const hudY = useTransform(p, [0.9, 1], [0, 40]);

  const cueO = useTransform(p, [0, 0.09, 0.17], [1, 1, 0]);

  // ── Reduced-motion: calm static hero ─────────────────────────────────────
  if (prefersReducedMotion) {
    return (
      <section className="relative flex min-h-[92dvh] items-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, oklch(0.28 0.09 282) 0%, oklch(0.19 0.04 285) 46%, oklch(0.152 0.005 285) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-32 text-center">
          <StaticHeadline />
          <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-foreground/75">
            Infinitents researches, scripts, renders, edits and publishes short-
            and long-form video — automatically, in batches.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <HeroCtas configured={configured} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* base gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, oklch(0.28 0.09 282) 0%, oklch(0.19 0.04 285) 46%, oklch(0.152 0.005 285) 100%)",
          }}
        />

        {/* video wall */}
        <motion.div
          aria-hidden
          style={{
            scale: wallScale,
            y: wallY,
            rotateX: wallRotateX,
            opacity: wallOpacity,
            transformPerspective: 1400,
          }}
          className="absolute inset-0 origin-center"
        >
          <div
            className="absolute left-1/2 top-1/2 grid h-[168%] w-[150%] -translate-x-1/2 -translate-y-1/2 grid-cols-3 gap-3 sm:grid-cols-5"
            style={{ transform: "translate(-50%, -50%) rotateZ(-7deg)" }}
          >
            {COLUMNS.map((c, i) => (
              <div key={i} className={cn("h-full", i >= 3 && "hidden sm:block")}>
                <VerticalColumn {...c} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* aurora */}
        <motion.div
          aria-hidden
          style={{ opacity: auroraOpacity }}
          className="animate-aurora pointer-events-none absolute -left-1/4 top-0 h-[70%] w-[70%] rounded-full blur-3xl mix-blend-screen"
        >
          <div
            className="size-full"
            style={{ background: "radial-gradient(closest-side, oklch(0.55 0.2 285), transparent)" }}
          />
        </motion.div>
        <motion.div
          aria-hidden
          style={{ opacity: auroraOpacity }}
          className="animate-aurora pointer-events-none absolute -right-1/4 top-1/4 h-[60%] w-[60%] rounded-full blur-3xl mix-blend-screen"
        >
          <div
            className="size-full"
            style={{ background: "radial-gradient(closest-side, oklch(0.6 0.16 320), transparent)" }}
          />
        </motion.div>

        {/* scrims — kept light + localized so the wall stays visible */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/80 via-background/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-background" />
        <motion.div
          aria-hidden
          style={{ opacity: poolOpacity }}
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="size-full"
            style={{
              background:
                "radial-gradient(42% 40% at 50% 46%, color-mix(in oklch, var(--color-background) 66%, transparent) 0%, color-mix(in oklch, var(--color-background) 18%, transparent) 50%, transparent 76%)",
            }}
          />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_50%,transparent_68%,color-mix(in_oklch,var(--color-background)_80%,transparent)_100%)]" />
        <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.12]" />

        <StageDots progress={p} />

        {/* ── Center content ─────────────────────────────────────────────── */}
        <motion.div
          style={{ y: contentY, opacity: contentO, scale: contentScale }}
          className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="glass inline-flex items-center gap-2 rounded-full border border-border/60 px-3.5 py-1.5 text-[12.5px] font-medium text-foreground/80"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Auto-batch AI video generation, running 24/7
          </motion.div>

          <h1 className="mt-7 text-balance text-[2.7rem] font-semibold leading-[1.03] tracking-tight [text-shadow:0_2px_30px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-[4.6rem]">
            <motion.span
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="block"
            >
              Generate a
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.17, ease: EASE }}
              className="block [text-shadow:none]"
            >
              <Typewriter words={TYPE_WORDS} />
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.26, ease: EASE }}
              className="block"
            >
              in a single batch.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.36, ease: EASE }}
            className="mt-6 max-w-xl text-balance text-[15.5px] leading-relaxed text-foreground/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.6)] sm:text-lg"
          >
            Infinitents researches, scripts, renders, edits and publishes short-
            and long-form video — automatically, in batches. You don&apos;t manage
            AI. You manage outcomes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.46, ease: EASE }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <HeroCtas configured={configured} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.58, ease: EASE }}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50">
              Publishes natively to
            </span>
            <div className="glass flex items-center gap-6 rounded-2xl border border-border/60 px-6 py-3.5">
              {PLATFORMS.map((pf) => (
                <PlatformIcon
                  key={pf}
                  platform={pf}
                  className="size-5 opacity-80 saturate-[0.85] transition-all hover:opacity-100 hover:saturate-100"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ── Batch HUD (bottom) ─────────────────────────────────────────── */}
        <motion.div
          style={{ opacity: hudO, y: hudY }}
          className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-4"
        >
          <div className="glass flex w-full max-w-md items-center gap-3 rounded-2xl border border-border/60 px-4 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Sparkles className="size-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] font-medium">Generating this week&apos;s batch</span>
                <span className="text-[12.5px] font-semibold text-foreground">
                  <Scrub value={count} /> clips
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  style={{ width: barW }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.74_0.15_300)]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          style={{ opacity: cueO }}
          className="absolute inset-x-0 bottom-8 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-foreground/45">
            Scroll to generate
          </span>
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-foreground/20 p-1">
            <motion.span
              animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="size-1 rounded-full bg-foreground/60"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StaticHeadline() {
  return (
    <h1 className="text-balance text-[2.7rem] font-semibold leading-[1.03] tracking-tight sm:text-6xl">
      Generate a{" "}
      <span className="bg-gradient-to-br from-primary via-[oklch(0.72_0.16_300)] to-[oklch(0.74_0.14_250)] bg-clip-text text-transparent">
        week of video
      </span>{" "}
      in a single batch.
    </h1>
  );
}

function HeroCtas({ configured }: { configured: boolean }) {
  return (
    <>
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
    </>
  );
}
