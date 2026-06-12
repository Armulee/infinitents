"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Factory, Loader2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectSheet, StatusBadge } from "@/components/factory/project-sheet";
import { useAiJobs, useProjects } from "@/hooks/use-queries";
import { STAGE_LABELS, type AiJob, type ProjectStatus, type VideoProject } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

interface Column {
  key: string;
  title: string;
  statuses: ProjectStatus[];
  hint: string;
}

const COLUMNS: Column[] = [
  { key: "writing", title: "Writing", statuses: ["queued", "scripting", "auditing"], hint: "Script + audit agents" },
  { key: "visualizing", title: "Visualizing", statuses: ["storyboarding", "generating_assets"], hint: "Storyboard + references" },
  { key: "generating", title: "Generating", statuses: ["generating_video"], hint: "Parallel scene generation" },
  { key: "editing", title: "Editing", statuses: ["editing", "changes_requested"], hint: "Assembly + revisions" },
  { key: "review", title: "Review", statuses: ["ready_for_review"], hint: "Waiting on you" },
  { key: "shipping", title: "Shipping", statuses: ["approved", "scheduled", "publishing", "published"], hint: "Out the door" },
  { key: "attention", title: "Attention", statuses: ["failed"], hint: "Needs a human" },
];

export default function FactoryPage() {
  const { data: projects, isLoading } = useProjects();
  const { data: activeJobs } = useAiJobs({ activeOnly: true });
  const [selected, setSelected] = useState<string | null>(null);

  const jobByProject = useMemo(() => {
    const map = new Map<string, AiJob>();
    for (const job of activeJobs ?? []) {
      if (job.project_id && !map.has(job.project_id)) map.set(job.project_id, job);
    }
    return map;
  }, [activeJobs]);

  const live = (projects ?? []).filter((p) => p.status !== "archived");

  return (
    <PageContainer wide className="flex min-h-dvh flex-col">
      <PageHeader
        title="Content Factory"
        description="Every video moving through the pipeline, live."
      />

      {isLoading ? (
        <div className="mt-6 flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-64 shrink-0" />
          ))}
        </div>
      ) : live.length === 0 ? (
        <EmptyFactory />
      ) : (
        <div className="-mx-4 mt-6 flex-1 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex h-full min-w-max gap-3.5">
            {COLUMNS.map((col) => {
              const items = live.filter((p) => col.statuses.includes(p.status));
              if (col.key === "attention" && items.length === 0) return null;
              return (
                <div key={col.key} className="flex w-[268px] shrink-0 flex-col">
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h2
                        className={cn(
                          "text-[13px] font-semibold",
                          col.key === "attention" && "text-destructive",
                          col.key === "review" && items.length > 0 && "text-primary",
                        )}
                      >
                        {col.title}
                      </h2>
                      <span className="rounded-md bg-secondary px-1.5 py-px text-[11px] font-semibold text-muted-foreground tnum">
                        {items.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/70">{col.hint}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 rounded-xl bg-secondary/30 p-2">
                    <AnimatePresence mode="popLayout">
                      {items.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          job={jobByProject.get(project.id)}
                          onClick={() => setSelected(project.id)}
                        />
                      ))}
                    </AnimatePresence>
                    {items.length === 0 && (
                      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 text-[12px] text-muted-foreground/50">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ProjectSheet projectId={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  );
}

function ProjectCard({
  project,
  job,
  onClick,
}: {
  project: VideoProject;
  job?: AiJob;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      layoutId={project.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      onClick={onClick}
      className="card-hover w-full rounded-xl border border-border/80 bg-card p-3 text-left shadow-sm"
    >
      <div className="flex items-start gap-2.5">
        <div className="relative h-14 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-950">
          {project.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.thumbnail_url} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Factory className="size-3.5 text-zinc-700" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-medium leading-snug">{project.title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(project.created_at)}</p>
        </div>
      </div>

      {job ? (
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 font-medium text-primary">
              <Loader2 className="size-2.5 animate-spin" />
              {job.progress_label ?? STAGE_LABELS[job.stage]}
            </span>
            <span className="text-muted-foreground tnum">{Math.round(job.progress)}%</span>
          </div>
          <Progress value={job.progress} className="h-1" />
        </div>
      ) : (
        <div className="mt-2.5">
          <StatusBadge status={project.status} />
        </div>
      )}
    </motion.button>
  );
}

function EmptyFactory() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-20 flex flex-col items-center text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Factory className="size-7 text-primary" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">The floor is quiet</h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
        Produce an idea from the Viral Lab — or let autopilot fill the line on its daily schedule.
      </p>
    </motion.div>
  );
}
