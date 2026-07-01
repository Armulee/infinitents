"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";
import { SHOWCASE, rotate, type ShowcaseVideo } from "./showcase-data";

/**
 * A horizontally-scrolling rail of showcase clips. Two identical halves sit
 * side by side and the track slides exactly one half-width, so the loop is
 * seamless. An optional `drift` motion value adds a scroll-linked nudge on
 * top of the auto-marquee — the track already overflows and is edge-masked,
 * so the extra translate never exposes a gap. Pauses on hover / reduced-motion.
 */
export function VideoRail({
  videos,
  direction = "left",
  duration = 60,
  tileClassName,
  showMeta = false,
  className,
  drift,
}: {
  videos: ShowcaseVideo[];
  direction?: "left" | "right";
  duration?: number;
  tileClassName?: string;
  showMeta?: boolean;
  className?: string;
  drift?: MotionValue<string>;
}) {
  const half = [...videos];
  return (
    <div className={cn("marquee-group edge-fade-x overflow-hidden", className)}>
      <motion.div style={drift ? { x: drift } : undefined}>
        <div
          className={cn(
            "marquee-track marquee-anim gap-3 sm:gap-4",
            direction === "left" ? "animate-marquee-x" : "animate-marquee-x-rev",
          )}
          style={{ animationDuration: `${duration}s` }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4"
            >
              {half.map((v) => (
                <VideoTile
                  key={`${copy}-${v.id}`}
                  video={v}
                  showMeta={showMeta}
                  className={cn("w-[132px] sm:w-[176px]", tileClassName)}
                />
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * The two-rail showcase reel. As the section scrolls through the viewport the
 * rails drift in opposite directions, so the wall of real output visibly reacts
 * to the user's scroll — the same scroll-linked feel as the pinned batch act.
 */
export function ShowcaseReel() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 26,
    restDelta: 0.001,
  });
  const driftL = useTransform(smooth, [0, 1], ["7%", "-7%"]);
  const driftR = useTransform(smooth, [0, 1], ["-7%", "7%"]);

  return (
    <div ref={ref} className="space-y-3 sm:space-y-4">
      <VideoRail videos={rotate(SHOWCASE, 0)} direction="left" duration={55} drift={driftL} />
      <VideoRail
        videos={rotate(SHOWCASE, 3)}
        direction="right"
        duration={68}
        showMeta
        drift={driftR}
      />
    </div>
  );
}
