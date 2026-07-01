"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Layers, Sparkles } from "lucide-react";
import { VideoTile } from "./video-tile";
import { SHOWCASE, rotate } from "./showcase-data";

/**
 * Pinned horizontal-scroll act. The section is tall; its inner panel sticks to
 * the viewport while the page scrolls, and that scroll progress drives a
 * horizontal translation of the clip row — the "one brief → a batch of
 * finished videos" idea, told through motion instead of copy.
 */
export function BatchScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });

  // Slide the rail from just-entered to fully-past across the pin.
  const x = useTransform(smooth, [0, 1], ["4%", "-72%"]);
  const headingOpacity = useTransform(smooth, [0, 0.12, 0.85, 1], [0, 1, 1, 0.4]);
  const progressWidth = useTransform(smooth, [0, 1], ["0%", "100%"]);

  const rail = [...SHOWCASE, ...rotate(SHOWCASE, 3)];

  return (
    <section ref={ref} className="relative h-[320vh] bg-black">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        {/* ambient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(90% 60% at 50% 0%, oklch(0.3 0.1 285) 0%, transparent 60%)",
          }}
        />
        <div aria-hidden className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.18]" />

        <motion.div
          style={{ opacity: headingOpacity }}
          className="relative z-10 mx-auto mb-8 max-w-3xl px-6 text-center sm:mb-10"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/70 backdrop-blur">
            <Layers className="size-3.5 text-primary" /> One brief → a full batch
          </span>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Set the count. Wake up to a{" "}
            <span className="bg-gradient-to-r from-[oklch(0.8_0.14_300)] via-primary to-[oklch(0.78_0.13_250)] bg-clip-text text-transparent">
              week of video
            </span>
            .
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-balance text-[14.5px] leading-relaxed text-white/60">
            The pipeline researches, scripts, renders and edits every clip in
            parallel — long-form or short, batched overnight, ready for one-swipe
            approval.
          </p>
        </motion.div>

        {/* the scroll-linked rail */}
        <motion.div style={{ x }} className="relative z-10 flex gap-4 px-6 sm:gap-5">
          {rail.map((v, i) => (
            <div
              key={`${v.id}-${i}`}
              className="relative w-[210px] shrink-0 sm:w-[260px]"
              style={{ transform: `translateY(${(i % 3) * 14 - 14}px)` }}
            >
              <VideoTile video={v} priority={i < 4} showMeta rounded="rounded-3xl" />
              <span className="absolute -top-3 left-3 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur">
                <Sparkles className="size-2.5 text-primary" /> #{String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </motion.div>

        {/* pinned scrub progress */}
        <div className="relative z-10 mx-auto mt-10 h-[3px] w-40 overflow-hidden rounded-full bg-white/10 sm:w-56">
          <motion.div
            style={{ width: progressWidth }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.78_0.13_300)]"
          />
        </div>
      </div>
    </section>
  );
}
