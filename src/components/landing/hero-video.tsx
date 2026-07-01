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
import { SHOWCASE, rotate, type ShowcaseVideo } from "./showcase-data";

/**
 * Cinematic hero backdrop: a tilted wall of vertical clips drifting on
 * opposing rails, washed with an aurora + conic glow and scrimmed so the
 * headline stays crisp. The whole wall parallaxes as the page scrolls.
 * Reduced-motion users get the static gradient posters (no drift, no playback).
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

export function HeroVideo() {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const columns = [
    { videos: rotate(SHOWCASE, 0), direction: "up" as const, duration: 44 },
    { videos: rotate(SHOWCASE, 2), direction: "down" as const, duration: 52 },
    { videos: rotate(SHOWCASE, 4), direction: "up" as const, duration: 48 },
    { videos: rotate(SHOWCASE, 6), direction: "down" as const, duration: 58 },
    { videos: rotate(SHOWCASE, 1), direction: "up" as const, duration: 50 },
    { videos: rotate(SHOWCASE, 3), direction: "down" as const, duration: 46 },
  ];

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden">
      {/* base gradient — also the reduced-motion still */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, oklch(0.3 0.09 282) 0%, oklch(0.2 0.04 285) 44%, oklch(0.156 0.005 285) 100%)",
        }}
      />

      {/* tilted video wall */}
      {!prefersReducedMotion && (
        <motion.div
          style={{ y, scale, opacity }}
          className="perspective-deep absolute inset-0"
        >
          <div
            className="absolute left-1/2 top-1/2 grid h-[150%] w-[135%] -translate-x-1/2 -translate-y-1/2 grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
            style={{
              transform:
                "translate(-50%, -50%) rotateX(14deg) rotateZ(-8deg) scale(1.05)",
            }}
          >
            {columns.map((c, i) => (
              <VerticalColumn key={i} {...c} />
            ))}
          </div>
        </motion.div>
      )}

      {/* aurora blobs */}
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute -left-1/4 top-0 h-[70%] w-[70%] rounded-full opacity-60 blur-3xl mix-blend-screen"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.55 0.2 285), transparent)",
        }}
      />
      <div
        aria-hidden
        className="animate-aurora pointer-events-none absolute -right-1/4 top-1/4 h-[60%] w-[60%] rounded-full opacity-50 blur-3xl mix-blend-screen"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.6 0.16 320), transparent)",
          animationDelay: "-8s",
        }}
      />

      {/* scrims — keep the headline readable over any frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/72 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_65%_at_50%_42%,transparent_0%,color-mix(in_oklch,var(--color-background)_82%,transparent)_100%)]" />
      <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.15]" />

      {/* hairline that seats the hero onto the page */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
