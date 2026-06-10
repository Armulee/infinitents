"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  Clapperboard,
  FlaskConical,
  Heart,
  Lightbulb,
  Loader2,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useEnqueueStage,
  useIdeas,
  useProduceIdea,
  useUpdateIdeaStatus,
} from "@/hooks/use-queries";
import { useWorkspace } from "@/lib/workspace-context";
import type { GeneratedIdea } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const TRIGGER_STYLES: Record<string, string> = {
  curiosity: "bg-chart-2/15 text-chart-2",
  fomo: "bg-chart-4/15 text-chart-4",
  surprise: "bg-chart-5/15 text-chart-5",
  validation: "bg-chart-3/15 text-chart-3",
  aspiration: "bg-primary/15 text-primary",
  controversy: "bg-destructive/15 text-destructive",
  relief: "bg-chart-2/15 text-chart-2",
};

type Filter = "new" | "shortlisted" | "in_production" | "all";

export default function ViralLabPage() {
  const { workspace, brand } = useWorkspace();
  const [filter, setFilter] = useState<Filter>("new");
  const { data: ideas, isLoading } = useIdeas();
  const produce = useProduceIdea();
  const updateStatus = useUpdateIdeaStatus();
  const enqueue = useEnqueueStage();

  const filtered = useMemo(() => {
    const list = ideas ?? [];
    if (filter === "all") return list.filter((i) => i.status !== "archived" && i.status !== "rejected");
    return list.filter((i) => i.status === filter);
  }, [ideas, filter]);

  const generating = enqueue.isPending;

  return (
    <PageContainer wide>
      <PageHeader
        title="Viral Lab"
        description="Hypothesis-driven ideas from your Brand Brain, trends and performance learnings."
        actions={
          <Button
            disabled={!brand || generating}
            onClick={() =>
              enqueue.mutate({
                stage: "idea_generation",
                payload: {
                  brand_id: brand!.id,
                  count: (workspace?.daily_video_target ?? 3) * 2,
                },
              })
            }
          >
            {generating ? <Loader2 className="animate-spin" /> : <Zap />}
            Generate {(workspace?.daily_video_target ?? 3) * 2} ideas
          </Button>
        }
      />

      <div className="mt-5">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="new">Fresh</TabsTrigger>
            <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
            <TabsTrigger value="in_production">In production</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <motion.div layout className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((idea, i) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={i}
                onProduce={() => produce.mutate(idea.id)}
                onShortlist={() =>
                  updateStatus.mutate({
                    id: idea.id,
                    status: idea.status === "shortlisted" ? "new" : "shortlisted",
                  })
                }
                onArchive={() => updateStatus.mutate({ id: idea.id, status: "archived" })}
                producing={produce.isPending && produce.variables === idea.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </PageContainer>
  );
}

function IdeaCard({
  idea,
  index,
  onProduce,
  onShortlist,
  onArchive,
  producing,
}: {
  idea: GeneratedIdea;
  index: number;
  onProduce: () => void;
  onShortlist: () => void;
  onArchive: () => void;
  producing: boolean;
}) {
  const triggerStyle =
    TRIGGER_STYLES[idea.emotional_trigger.toLowerCase()] ?? "bg-secondary text-secondary-foreground";
  const inProduction = idea.status === "in_production";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="card-hover group flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <ScorePill score={idea.predicted_score} />
            <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium capitalize", triggerStyle)}>
              <Heart className="mr-1 inline size-3" />
              {idea.emotional_trigger}
            </span>
          </div>
          <button
            onClick={onShortlist}
            className={cn(
              "rounded-md p-1 transition-colors",
              idea.status === "shortlisted"
                ? "text-warning"
                : "text-muted-foreground/40 hover:text-warning",
            )}
            aria-label="Shortlist"
          >
            <Star className={cn("size-4", idea.status === "shortlisted" && "fill-current")} />
          </button>
        </div>

        <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">
          {idea.hook}
        </h3>

        <div className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <div className="flex gap-2">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-chart-4" />
            <span className="line-clamp-2">{idea.angle}</span>
          </div>
          <div className="flex gap-2">
            <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-chart-3" />
            <span className="line-clamp-2">{idea.viral_hypothesis}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            {idea.content_pillar && <Badge variant="outline">{idea.content_pillar}</Badge>}
            <span>{timeAgo(idea.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            {!inProduction && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onArchive}
                className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
                aria-label="Archive"
              >
                <Archive className="size-3.5" />
              </Button>
            )}
            {inProduction ? (
              <Badge variant="success">
                <Clapperboard className="size-3" /> In production
              </Badge>
            ) : (
              <Button size="sm" onClick={onProduce} disabled={producing}>
                {producing ? <Loader2 className="animate-spin" /> : <Clapperboard />}
                Produce
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 80 ? "text-success bg-success/12" : score >= 65 ? "text-chart-4 bg-chart-4/12" : "text-muted-foreground bg-secondary";
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold tnum", tone)}>
      {score.toFixed(0)}
    </span>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 flex flex-col items-center text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        {filter === "in_production" ? (
          <Clapperboard className="size-7 text-primary" />
        ) : (
          <FlaskConical className="size-7 text-primary" />
        )}
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">
        {filter === "in_production" ? "Nothing in production from here yet" : "No ideas in this view"}
      </h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
        {filter === "in_production" ? (
          <>Hit Produce on an idea and it flows through script → audit → storyboard → video automatically.</>
        ) : (
          <>
            <Sparkles className="mr-1 inline size-3.5" />
            Generate a batch — the lab studies your Brand Brain and past performance before writing a
            single hook.
          </>
        )}
      </p>
    </motion.div>
  );
}
