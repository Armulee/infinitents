"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { PageContainer } from "@/components/shell/page-header";
import { QueueDeck } from "@/components/queue/queue-deck";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiJobs, useProjects } from "@/hooks/use-queries";

/**
 * Content Queue — the most important page. TikTok × Linear: a centered feed,
 * one video at a time, decisive actions. Mobile is full-screen with swipe.
 */
export default function QueuePage() {
  const { data: projects, isLoading } = useProjects(["ready_for_review"]);
  const { data: activeJobs } = useAiJobs({ activeOnly: true });
  const producing = (activeJobs ?? []).filter((j) =>
    ["video_generation", "editing", "prompt_packing"].includes(j.stage),
  ).length;

  return (
    <PageContainer className="flex min-h-[calc(100dvh-80px)] flex-col md:min-h-dvh">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Content Queue</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Review what your content department produced.
          </p>
        </div>
        {producing > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-[12px] font-medium text-primary">
            <Loader2 className="size-3.5 animate-spin" />
            {producing} more in production
          </div>
        )}
      </motion.div>

      <div className="flex flex-1 items-start justify-center pt-2">
        {isLoading ? (
          <div className="w-full max-w-[340px] sm:max-w-[360px]">
            <Skeleton className="aspect-[9/16] w-full rounded-2xl" />
            <div className="mt-6 flex justify-center gap-3">
              {[44, 48, 64, 48, 44].map((s, i) => (
                <Skeleton key={i} className="rounded-full" style={{ width: s, height: s }} />
              ))}
            </div>
          </div>
        ) : (
          <QueueDeck projects={projects ?? []} />
        )}
      </div>
    </PageContainer>
  );
}
