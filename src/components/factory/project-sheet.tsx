"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clapperboard,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnqueueStage, useProjectBundle } from "@/hooks/use-queries";
import { PROJECT_STATUS_LABELS, type AuditReport } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectSheet({
  projectId,
  onClose,
}: {
  projectId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useProjectBundle(projectId);
  const enqueue = useEnqueueStage();
  const project = data?.project;
  const audit = data?.audits?.[0];

  return (
    <Sheet open={Boolean(projectId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {isLoading || !project ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b border-border p-5 pr-12">
              <div className="flex items-center gap-2">
                <StatusBadge status={project.status} />
                {data?.idea?.content_pillar && (
                  <Badge variant="outline">{data.idea.content_pillar}</Badge>
                )}
              </div>
              <SheetTitle className="text-[17px] leading-snug">{project.title}</SheetTitle>
              <SheetDescription>
                {data?.idea?.viral_hypothesis ?? "Produced by your content pipeline."}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-6 p-5">
                {project.status === "failed" && project.review_note && (
                  <div className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/8 p-3.5 text-[13px]">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div>
                      <div className="font-medium text-destructive">Needs attention</div>
                      <p className="mt-0.5 text-muted-foreground">{project.review_note}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2.5"
                        disabled={enqueue.isPending}
                        onClick={() =>
                          enqueue.mutate({
                            stage: "prompt_packing",
                            payload: { project_id: project.id },
                            project_id: project.id,
                          })
                        }
                      >
                        <RotateCcw /> Retry generation
                      </Button>
                    </div>
                  </div>
                )}

                {/* Audit */}
                {audit && <AuditSection audit={audit} />}

                {/* Script */}
                {data?.script && (
                  <section>
                    <SectionTitle icon={FileText}>Script</SectionTitle>
                    <div className="mt-2.5 space-y-2">
                      {data.script.scenes.map((scene) => (
                        <div
                          key={scene.index}
                          className="rounded-xl border border-border/70 bg-background/50 p-3"
                        >
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="font-semibold uppercase tracking-wider">
                              Scene {scene.index + 1}
                            </span>
                            <span className="tnum">{scene.duration_s}s</span>
                          </div>
                          <p className="mt-1.5 text-[13px] leading-relaxed">{scene.voiceover}</p>
                          <p className="mt-1.5 text-[12px] italic leading-relaxed text-muted-foreground">
                            <Camera className="mr-1 inline size-3" />
                            {scene.visual_direction}
                          </p>
                        </div>
                      ))}
                      {data.script.cta && (
                        <p className="px-1 text-[12.5px] text-muted-foreground">
                          CTA: <span className="text-foreground">{data.script.cta}</span>
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Clips */}
                {(data?.clips?.length ?? 0) > 0 && (
                  <section>
                    <SectionTitle icon={Clapperboard}>Generated scenes</SectionTitle>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      {data!.clips.map((clip) => (
                        <div
                          key={clip.id}
                          className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border/70 bg-zinc-950"
                        >
                          {clip.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={clip.thumbnail_url}
                              alt={`Scene ${clip.scene_index + 1}`}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              {clip.status === "generating" || clip.status === "pending" ? (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              ) : clip.status === "failed" ? (
                                <XCircle className="size-4 text-destructive" />
                              ) : (
                                <Clapperboard className="size-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-medium text-white tnum">
                            S{clip.scene_index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 border-t border-border p-4">
              <Button asChild className="flex-1">
                <Link href={`/studio/${project.id}`}>
                  <Pencil /> Open in Studio
                </Link>
              </Button>
              {project.status === "ready_for_review" && (
                <Button variant="secondary" asChild className="flex-1">
                  <Link href="/queue">Review in queue</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </h3>
  );
}

function AuditSection({ audit }: { audit: AuditReport }) {
  const dims = [
    { label: "Platform safety", value: audit.platform_safety },
    { label: "Copyright", value: audit.copyright_risk },
    { label: "Clarity", value: audit.clarity },
    { label: "Brand alignment", value: audit.brand_alignment },
  ];
  return (
    <section>
      <SectionTitle icon={ShieldCheck}>Audit report</SectionTitle>
      <div className="mt-2.5 rounded-xl border border-border/70 bg-background/50 p-3.5">
        <div className="flex items-center gap-4">
          <ScoreRing label="Viral" value={audit.viral_score} tone="primary" />
          <ScoreRing label="Risk" value={audit.risk_score} tone={audit.risk_score > 40 ? "danger" : "success"} invert />
          <div className="flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {audit.report?.summary}
          </div>
        </div>
        <Separator className="my-3" />
        <div className="grid grid-cols-2 gap-2">
          {dims.map((d) => (
            <div key={d.label} className="flex items-center justify-between rounded-lg bg-secondary/50 px-2.5 py-1.5 text-[12px]">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-semibold tnum">{d.value?.score ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScoreRing({
  label,
  value,
  tone,
  invert,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "danger";
  invert?: boolean;
}) {
  const colors = {
    primary: "text-primary",
    success: "text-success",
    danger: "text-destructive",
  };
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-12">
        <svg viewBox="0 0 36 36" className="size-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-secondary" strokeWidth="3.5" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
            className={cn("transition-all duration-700", colors[tone], invert && pct < 50 ? "stroke-current" : "stroke-current")}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold tnum">
          {Math.round(value)}
        </span>
      </div>
      <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: keyof typeof PROJECT_STATUS_LABELS }) {
  const styles: Partial<Record<typeof status, string>> = {
    ready_for_review: "bg-primary/15 text-primary border-transparent",
    published: "bg-success/15 text-success border-transparent",
    approved: "bg-success/15 text-success border-transparent",
    scheduled: "bg-chart-2/15 text-chart-2 border-transparent",
    failed: "bg-destructive/15 text-destructive border-transparent",
    changes_requested: "bg-warning/15 text-warning border-transparent",
  };
  const isActive = [
    "queued",
    "scripting",
    "auditing",
    "storyboarding",
    "generating_assets",
    "generating_video",
    "editing",
    "publishing",
  ].includes(status);
  return (
    <Badge variant="outline" className={cn(styles[status])}>
      {isActive && <CheckCircle2 className="hidden" />}
      {isActive && <Loader2 className="size-3 animate-spin" />}
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
