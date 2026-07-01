"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Rotating typewriter. Types a phrase, holds, deletes, moves to the next and
 * loops. The gradient text and a blinking accent caret are rendered inline so
 * it drops into a headline. Reduced-motion users see the first phrase, static.
 */
export function Typewriter({
  words,
  className,
  typeSpeed = 68,
  deleteSpeed = 34,
  hold = 1500,
}: {
  words: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  hold?: number;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [sub, setSub] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const word = words[index] ?? "";

    // Finished typing → hold, then start deleting.
    if (!deleting && sub === word.length) {
      const t = setTimeout(() => setDeleting(true), hold);
      return () => clearTimeout(t);
    }
    // Finished deleting → advance to the next word.
    if (deleting && sub === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(
      () => setSub((s) => s + (deleting ? -1 : 1)),
      deleting ? deleteSpeed : typeSpeed,
    );
    return () => clearTimeout(t);
  }, [sub, deleting, index, words, reduce, typeSpeed, deleteSpeed, hold]);

  const text = reduce ? (words[0] ?? "") : (words[index] ?? "").slice(0, sub);

  return (
    <span className="inline-flex items-baseline">
      <span
        className={cn(
          "bg-gradient-to-br from-primary via-[oklch(0.72_0.16_300)] to-[oklch(0.74_0.14_250)] bg-clip-text text-transparent",
          className,
        )}
      >
        {text}
      </span>
      <span
        aria-hidden
        className={cn(
          "ml-[0.06em] inline-block h-[0.82em] w-[0.055em] translate-y-[0.04em] rounded-full bg-primary",
          !reduce && "animate-caret",
        )}
      />
    </span>
  );
}
