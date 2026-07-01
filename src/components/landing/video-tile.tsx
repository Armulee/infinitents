"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ShowcaseVideo } from "./showcase-data";

/**
 * A single vertical showcase clip.
 *
 * Performance: many of these live on one page, so each only mounts its
 * <video> and starts playback once it scrolls near the viewport (via
 * IntersectionObserver) and pauses once it leaves — keeping only a handful
 * decoding at a time. The gradient poster is always painted underneath, so a
 * buffering or reduced-motion tile still looks intentional, never blank.
 */
export function VideoTile({
  video,
  className,
  rounded = "rounded-2xl",
  showMeta = true,
  priority = false,
  still = false,
}: {
  video: ShowcaseVideo;
  className?: string;
  rounded?: string;
  showMeta?: boolean;
  priority?: boolean;
  /** Poster-only tile — never mounts a <video>. Used for duplicated marquee
   *  halves so a seamless loop doesn't double the decoder count. */
  still?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(priority);
  const [ready, setReady] = useState(false);

  // Mount/play only while near the viewport.
  useEffect(() => {
    if (prefersReducedMotion || still) return;
    const el = wrapRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "300px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReducedMotion]);

  // Drive play/pause off `active` so offscreen tiles stop decoding.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);

  const mountVideo = active && !prefersReducedMotion && !still;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "group relative aspect-[9/16] overflow-hidden border border-white/10 bg-black/40 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]",
        rounded,
        className,
      )}
      style={{ background: video.poster }}
    >
      {mountVideo && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={(e) => {
            setReady(true);
            e.currentTarget.play().catch(() => {});
          }}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <source src={video.src} type="video/mp4" />
        </video>
      )}

      {/* Legibility scrim + subtle top sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-white/[0.06]" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ring-1 ring-inset ring-primary/40 rounded-[inherit]" />

      {showMeta && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-medium text-white/90">
              {video.label}
            </p>
            <p className="text-[10px] text-white/55">{video.caption}</p>
          </div>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/12 backdrop-blur">
            <span className="size-1.5 rounded-full bg-success shadow-[0_0_8px_2px_color-mix(in_oklch,var(--color-success)_60%,transparent)]" />
          </span>
        </div>
      )}
    </div>
  );
}
