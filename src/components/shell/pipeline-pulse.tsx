"use client";

import { useEffect, useRef } from "react";
import { useAiJobs } from "@/hooks/use-queries";

/**
 * Keeps the queue draining while the app is open: when jobs are pending we
 * tick the worker endpoint every few seconds. Production deployments also run
 * cron / the standalone worker — claiming is SKIP LOCKED, so overlap is safe.
 */
export function PipelinePulse() {
  const { data: activeJobs } = useAiJobs({ activeOnly: true });
  const ticking = useRef(false);

  const hasWork = (activeJobs?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasWork) return;
    let cancelled = false;

    const tick = async () => {
      if (ticking.current || document.hidden) return;
      ticking.current = true;
      try {
        await fetch("/api/jobs/process", { method: "POST" });
      } catch {
        // network hiccup — next interval retries
      } finally {
        ticking.current = false;
      }
    };

    tick();
    const interval = setInterval(() => {
      if (!cancelled) tick();
    }, 4_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hasWork]);

  return null;
}
