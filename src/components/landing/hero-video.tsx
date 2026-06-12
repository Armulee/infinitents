"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Hero background video — mockup reel for now.
 * Swap HERO_VIDEO_SRC for the real brand reel (a ~10–20s loop of product
 * output: vertical videos being approved, published, charts climbing).
 * UX guardrails: muted/looped/inline, fades in only once it can play,
 * gradient poster while loading, and a static backdrop for users who
 * prefer reduced motion.
 */
// Mainstream browsers pick the H.264 MP4 (3.8 MB); the VP9 WebM is only
// fetched by builds without H.264. Both verified live (Google's legacy
// gtv-videos-bucket sample URLs now 403).
const HERO_SOURCES = [
  {
    src: "https://storage.googleapis.com/exoplayer-test-media-1/mp4/android-screens-25s.mp4",
    type: "video/mp4",
  },
  {
    src: "https://storage.googleapis.com/exoplayer-test-media-1/gen-3/screens/dash-vod-single-segment/video-vp9-360.webm",
    type: "video/webm",
  },
];

export function HeroVideo() {
  const prefersReducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= 3) setReady(true);
    // Some browsers (Low Power Mode, strict policies) ignore the autoplay
    // attribute — nudge playback explicitly; the gradient poster stays up if
    // it's refused.
    video.play().catch(() => {});
  }, [prefersReducedMotion]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* static backdrop — also the loading poster and reduced-motion fallback */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, oklch(0.32 0.09 282) 0%, oklch(0.21 0.04 285) 42%, oklch(0.156 0.005 285) 100%)",
        }}
      />

      {!prefersReducedMotion && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            setReady(true);
            e.currentTarget.play().catch(() => {});
          }}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out ${
            ready ? "opacity-40" : "opacity-0"
          }`}
        >
          {HERO_SOURCES.map((s) => (
            <source key={s.type} src={s.src} type={s.type} />
          ))}
        </video>
      )}

      {/* scrims — keep the headline readable over any frame of the video */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/25 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(85%_70%_at_50%_38%,transparent_0%,var(--color-background)_100%)]" />
      {/* brand wash */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, oklch(0.55 0.2 285), transparent 70%)",
        }}
      />
      {/* hairline that seats the hero onto the page */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
