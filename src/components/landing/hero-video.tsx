"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";
import { SHOWCASE, type ShowcaseVideo } from "./showcase-data";

/**
 * Cinematic hero backdrop: a tilted wall of vertical clips drifting on
 * opposing rails. Scrims are deliberately light and *localized* — a soft
 * pool of darkness sits only behind the headline, so the wall stays vivid
 * across the top and sides instead of being washed flat. The whole wall
 * parallaxes and fades as the page scrolls.
 *
 * Each column carries a small slice of the reel (3 clips) so the total number
 * of decoding <video> elements stays modest and playback is reliable.
 */

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

export function HeroVideo() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden">
      {/* base gradient — also the reduced-motion still */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, oklch(0.28 0.09 282) 0%, oklch(0.19 0.04 285) 46%, oklch(0.152 0.005 285) 100%)",
        }}
      />

      {/* tilted video wall */}
      {!prefersReducedMotion && (
        <motion.div style={{ y, scale, opacity }} className="perspective-deep absolute inset-0">
          <div
            className="absolute left-1/2 top-1/2 grid h-[168%] w-[150%] -translate-x-1/2 -translate-y-1/2 grid-cols-3 gap-3 sm:grid-cols-5"
            style={{
              transform:
                "translate(-50%, -50%) rotateX(11deg) rotateZ(-7deg) scale(1.04)",
            }}
          >
            {COLUMNS.map((c, i) => (
              // On phones only the first 3 columns render (3-col grid);
              // the outer two appear from sm up (5-col grid).
              <div key={i} className={cn("h-full", i >= 3 && "hidden sm:block")}>
                <VerticalColumn {...c} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* aurora blobs — colour on top of the wall, screen-blended */}
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute -left-1/4 top-0 h-[70%] w-[70%] rounded-full opacity-40 blur-3xl mix-blend-screen"
        style={{ background: "radial-gradient(closest-side, oklch(0.55 0.2 285), transparent)" }}
      />
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute -right-1/4 top-1/4 h-[60%] w-[60%] rounded-full opacity-35 blur-3xl mix-blend-screen"
        style={{
          background: "radial-gradient(closest-side, oklch(0.6 0.16 320), transparent)",
          animationDelay: "-8s",
        }}
      />

      {/* ── Localized scrims — keep the wall vivid, text still crisp ──────── */}
      {/* nav legibility, top only */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-background/85 via-background/40 to-transparent" />
      {/* seat the hero onto the page, bottom only */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-background" />
      {/* soft pool of dark behind the headline block */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(48% 46% at 50% 47%, color-mix(in oklch, var(--color-background) 72%, transparent) 0%, color-mix(in oklch, var(--color-background) 24%, transparent) 46%, transparent 74%)",
        }}
      />
      {/* faint edge vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_105%_at_50%_50%,transparent_62%,color-mix(in_oklch,var(--color-background)_88%,transparent)_100%)]" />
      <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.12]" />

      {/* hairline that seats the hero onto the page */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
