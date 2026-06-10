"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  Heart,
  Inbox,
  Loader2,
  Share2,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAiJobs,
  useAnalytics,
  useEnqueueStage,
  useIdeas,
  useProjects,
} from "@/hooks/use-queries";
import { useWorkspace } from "@/lib/workspace-context";
import { STAGE_LABELS } from "@/lib/types";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import { fadeUp, staggerChildren } from "@/lib/motion";

export default function DashboardPage() {
  const { workspace, brand } = useWorkspace();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: ideas } = useIdeas(["new", "shortlisted"]);
  const { data: jobs } = useAiJobs({ activeOnly: true });
  const { data: analytics } = useAnalytics(30);
  const enqueue = useEnqueueStage();

  const target = workspace?.daily_video_target ?? 3;

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const list = projects ?? [];
    const startedToday = list.filter((p) => new Date(p.created_at) >= start);
    const approvedToday = list.filter(
      (p) => p.approved_at && new Date(p.approved_at) >= start,
    );
    const publishedToday = list.filter(
      (p) => p.status === "published" && new Date(p.updated_at) >= start,
    );
    return { startedToday, approvedToday, publishedToday };
  }, [projects]);

  const readyForReview = (projects ?? []).filter((p) => p.status === "ready_for_review");
  const delivered = Math.max(today.approvedToday.length, today.publishedToday.length);
  const pct = Math.min(100, Math.round((delivered / target) * 100));

  const totals = useMemo(() => {
    const rows = analytics ?? [];
    // latest snapshot per publishing job
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const key = r.publishing_job_id ?? r.id;
      const prev = latest.get(key);
      if (!prev || new Date(r.collected_at) > new Date(prev.collected_at)) latest.set(key, r);
    }
    const snap = [...latest.values()];
    return {
      views: snap.reduce((a, r) => a + r.views, 0),
      likes: snap.reduce((a, r) => a + r.likes, 0),
      shares: snap.reduce((a, r) => a + r.shares, 0),
      followers: snap.reduce((a, r) => a + r.followers_delta, 0),
    };
  }, [analytics]);

  return (
    <PageContainer>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}`}
        description={`${workspace?.name ?? "Your workspace"} · ${brand?.name ?? "brand"} on autopilot`}
        actions={
          <Button
            variant="secondary"
            disabled={!brand || enqueue.isPending}
            onClick={() =>
              enqueue.mutate({
                stage: "idea_generation",
                payload: { brand_id: brand!.id, count: target * 2 },
              })
            }
          >
            {enqueue.isPending ? <Loader2 className="animate-spin" /> : <Zap />}
            Generate ideas
          </Button>
        }
      />

      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {/* ── Daily outcome ─────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} custom={0} className="lg:col-span-2">
          <Card className="relative h-full overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-[0.15] blur-3xl"
              style={{ background: "radial-gradient(closest-side, var(--color-primary), transparent)" }}
            />
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Today&apos;s outcome
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-semibold tracking-tight tnum">{delivered}</span>
                    <span className="text-xl text-muted-foreground tnum">/ {target}</span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                    videos approved &amp; on their way out
                  </p>
                </div>
                <div className="flex gap-6 text-[13px]">
                  <Stat label="In production" value={today.startedToday.length} />
                  <Stat label="Awaiting review" value={readyForReview.length} highlight />
                  <Stat label="Published" value={today.publishedToday.length} />
                </div>
              </div>
              <Progress value={pct} className="mt-6 h-2" />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild>
                  <Link href="/queue">
                    <Inbox />
                    Review queue
                    {readyForReview.length > 0 && (
                      <span className="rounded-md bg-white/20 px-1.5 text-[11.5px] font-bold tnum">
                        {readyForReview.length}
                      </span>
                    )}
                  </Link>
                </Button>
                <span className="text-[12.5px] text-muted-foreground">
                  {pct >= 100
                    ? "Target hit. The system keeps learning."
                    : readyForReview.length > 0
                      ? "Your decisions are the only bottleneck."
                      : "The factory is filling your queue."}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Pipeline live ─────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} custom={1}>
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Pipeline
              </CardTitle>
              <Link
                href="/factory"
                className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
              >
                Factory <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(jobs ?? []).length === 0 && (
                <div className="flex flex-col items-center py-6 text-center">
                  <CheckCircle2 className="size-6 text-success" />
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    All quiet. Autopilot runs daily{workspace?.autopilot ? "" : " (currently off)"}.
                  </p>
                </div>
              )}
              {(jobs ?? []).slice(0, 5).map((job) => (
                <div key={job.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Loader2 className="size-3 animate-spin text-primary" />
                      {STAGE_LABELS[job.stage]}
                    </span>
                    <span className="text-muted-foreground tnum">{Math.round(job.progress)}%</span>
                  </div>
                  <Progress value={job.progress} className="h-1" />
                  {job.progress_label && (
                    <p className="truncate text-[11.5px] text-muted-foreground">{job.progress_label}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Performance pulse ─────────────────────────────────────────── */}
        <motion.div variants={fadeUp} custom={2} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Last 30 days
              </CardTitle>
              <Link
                href="/analytics"
                className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
              >
                Analytics <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric icon={Eye} label="Views" value={formatNumber(totals.views)} />
                <Metric icon={Heart} label="Likes" value={formatNumber(totals.likes)} />
                <Metric icon={Share2} label="Shares" value={formatNumber(totals.shares)} />
                <Metric icon={UserPlus} label="New followers" value={formatNumber(totals.followers)} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Idea inventory ────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} custom={3}>
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Viral Lab
              </CardTitle>
              <Link
                href="/viral-lab"
                className="flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
              >
                Open <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight tnum">{ideas?.length ?? 0}</div>
                  <div className="text-[12.5px] text-muted-foreground">ideas ready to produce</div>
                </div>
              </div>
              {(ideas ?? []).slice(0, 2).map((idea) => (
                <div key={idea.id} className="mt-3 rounded-lg border border-border/70 bg-background/50 p-2.5">
                  <div className="line-clamp-1 text-[12.5px] font-medium">{idea.hook}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ArrowUpRight className="size-3 text-success" />
                    {idea.predicted_score.toFixed(0)} predicted score · {timeAgo(idea.created_at)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {projectsLoading && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-40" />
        </div>
      )}
    </PageContainer>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className={cn("text-xl font-semibold tracking-tight tnum", highlight && value > 0 && "text-primary")}>
        {value}
      </div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/50 p-3.5">
      <Icon className="size-4 text-muted-foreground" />
      <div className="mt-2 text-xl font-semibold tracking-tight tnum">{value}</div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
    </div>
  );
}
