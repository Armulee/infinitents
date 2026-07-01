"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Scroll-linked motion primitives shared across the landing page. Every one
 * reads the element's own progress through the viewport, so motion is *scrubbed*
 * to the scroll position (not a one-shot trigger) — scrolling up rewinds it.
 * All of them degrade to a plain <div> for reduced-motion users.
 */

/** Vertical parallax — drifts as the element crosses the viewport. */
export function Parallax({
  children,
  offset = 50,
  className,
}: {
  children: ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Scrubbed reveal — fades/rises (and optionally scales) in as the element
 * enters, tied continuously to scroll. `index` staggers items in a group by
 * shifting their progress window.
 */
export function Reveal({
  children,
  className,
  y = 46,
  scale,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  scale?: number;
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center 0.62"],
  });
  const start = Math.min(index * 0.1, 0.4);
  const end = start + 0.55;
  const raw = useTransform(scrollYProgress, [start, end], [0, 1], { clamp: true });
  const eased = useSpring(raw, { stiffness: 120, damping: 26, restDelta: 0.001 });
  const opacity = useTransform(eased, [0, 1], [0, 1]);
  const ty = useTransform(eased, [0, 1], [y, 0]);
  const sc = useTransform(eased, [0, 1], [scale ?? 1, 1]);

  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      style={{ opacity, y: ty, ...(scale ? { scale: sc } : {}) }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Horizontal drift tied to the section's scroll — used for the pipeline rail. */
export function ScrubX({
  children,
  from = "6%",
  to = "-6%",
  className,
}: {
  children: ReactNode;
  from?: string;
  to?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [from, to]);
  const x = useSpring(raw, { stiffness: 90, damping: 26, restDelta: 0.001 });
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ x }}>{children}</motion.div>
    </div>
  );
}

/** Horizontal hairline that draws itself in, scrubbed to scroll. */
export function ScrubLine({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "start 0.4"],
  });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  if (reduce) return <div aria-hidden ref={ref} className={className} />;
  return <motion.div aria-hidden ref={ref} style={{ scaleX }} className={className} />;
}
