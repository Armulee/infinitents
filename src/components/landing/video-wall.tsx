"use client";

import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";
import type { ShowcaseVideo } from "./showcase-data";

/**
 * A horizontally-scrolling rail of showcase clips. Two identical halves sit
 * side by side and the track slides exactly one half-width, so the loop is
 * seamless. Pauses on hover and for reduced-motion users.
 */
export function VideoRail({
  videos,
  direction = "left",
  duration = 60,
  tileClassName,
  showMeta = false,
  className,
}: {
  videos: ShowcaseVideo[];
  direction?: "left" | "right";
  duration?: number;
  tileClassName?: string;
  showMeta?: boolean;
  className?: string;
}) {
  const half = [...videos];
  return (
    <div className={cn("marquee-group edge-fade-x overflow-hidden", className)}>
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
    </div>
  );
}
