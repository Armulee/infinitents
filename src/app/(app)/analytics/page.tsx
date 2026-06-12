"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Eye,
  GraduationCap,
  Heart,
  MessageCircle,
  RefreshCw,
  Share2,
  UserPlus,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformIcon } from "@/components/publishing/platform-icons";
import {
  useAnalytics,
  useBrandKnowledge,
  useEnqueueStage,
  useProjects,
} from "@/hooks/use-queries";
import { PLATFORM_LABELS, type AnalyticsRow, type Platform } from "@/lib/types";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import { fadeUp, staggerChildren } from "@/lib/motion";

type Range = 7 | 30 | 90;

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const { data: rows, isLoading } = useAnalytics(range);
  const { data: knowledge } = useBrandKnowledge();
  const { data: projects } = useProjects();
  const enqueue = useEnqueueStage();

  const { latest, series, byPlatform, topVideos } = useMemo(
    () => digest(rows ?? [], projects ?? []),
    [rows, projects],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Performance flows back into the Brand Brain — the system gets sharper with every post."
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as Range)}>
              <TabsList>
                <TabsTrigger value="7">7d</TabsTrigger>
                <TabsTrigger value="30">30d</TabsTrigger>
                <TabsTrigger value="90">90d</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Sync analytics now"
              disabled={enqueue.isPending}
              onClick={() => enqueue.mutate({ stage: "analytics_sync" })}
            >
              {enqueue.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (rows ?? []).length === 0 ? (
        <EmptyAnalytics />
      ) : (
        <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="mt-6 space-y-4">
          {/* KPI row */}
          <motion.div variants={fadeUp} custom={0} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi icon={Eye} label="Views" value={latest.views} />
            <Kpi icon={Heart} label="Likes" value={latest.likes} />
            <Kpi icon={MessageCircle} label="Comments" value={latest.comments} />
            <Kpi icon={Share2} label="Shares" value={latest.shares} />
            <Kpi icon={UserPlus} label="Followers" value={latest.followers} signed />
          </motion.div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Views over time */}
            <motion.div variants={fadeUp} custom={1} className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                    Views over time
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
                      <defs>
                        <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={32}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => formatNumber(v)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12.5,
                        }}
                        formatter={(value) => [formatNumber(Number(value)), "Views"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fill="url(#views)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Platform breakdown */}
            <motion.div variants={fadeUp} custom={2}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                    By platform
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byPlatform} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={86}
                        tick={{ fontSize: 11.5, fill: "var(--color-muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "color-mix(in oklch, var(--color-foreground) 5%, transparent)" }}
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12.5,
                        }}
                        formatter={(value) => [formatNumber(Number(value)), "Views"]}
                      />
                      <Bar dataKey="views" radius={[4, 4, 4, 4]} fill="var(--color-primary)" barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Top videos */}
          <motion.div variants={fadeUp} custom={3}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                  Top videos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {topVideos.map((v, i) => (
                  <div key={v.projectId} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/50">
                    <span className="w-5 text-center text-[13px] font-bold text-muted-foreground tnum">
                      {i + 1}
                    </span>
                    <div className="h-12 w-8 shrink-0 overflow-hidden rounded-md bg-zinc-950">
                      {v.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.thumbnail} alt="" className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{v.title}</p>
                      <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <PlatformIcon platform={v.platform} className="size-3" />
                        {PLATFORM_LABELS[v.platform]} · {v.watchPct.toFixed(0)}% avg watch
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[13.5px] font-semibold tnum">{formatNumber(v.views)}</div>
                      <div className="text-[11px] text-muted-foreground">views</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning loop */}
          <motion.div variants={fadeUp} custom={4}>
            <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.05] to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[14px]">
                  <GraduationCap className="size-4 text-primary" /> Learning loop
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(knowledge?.learnings ?? []).length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    Insights are generated on every analytics sync and fed into the idea engine.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {knowledge!.learnings.slice(0, 4).map((l, i) => (
                      <div key={i} className="rounded-xl border border-primary/15 bg-card/60 p-3.5">
                        <p className="text-[13.5px] font-medium leading-snug">{l.insight}</p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {l.evidence} · {timeAgo(l.at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  signed,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  signed?: boolean;
}) {
  return (
    <Card className="p-4">
      <Icon className="size-4 text-muted-foreground" />
      <div className={cn("mt-2 text-xl font-semibold tracking-tight tnum", signed && value > 0 && "text-success")}>
        {signed && value > 0 ? "+" : ""}
        {formatNumber(value)}
      </div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
    </Card>
  );
}

function EmptyAnalytics() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-20 flex flex-col items-center text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <BarChart3 className="size-7 text-primary" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">No data yet</h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
        Once videos publish, metrics sync here automatically — and the learning loop starts
        compounding.
      </p>
    </motion.div>
  );
}

// ── data shaping ─────────────────────────────────────────────────────────────

function digest(
  rows: AnalyticsRow[],
  projects: { id: string; title: string; thumbnail_url: string | null }[],
) {
  // Latest snapshot per publishing job (rows accumulate per sync).
  const latestByJob = new Map<string, AnalyticsRow>();
  for (const r of rows) {
    const key = r.publishing_job_id ?? r.id;
    const prev = latestByJob.get(key);
    if (!prev || new Date(r.collected_at) > new Date(prev.collected_at)) latestByJob.set(key, r);
  }
  const snap = [...latestByJob.values()];

  const latest = {
    views: snap.reduce((a, r) => a + r.views, 0),
    likes: snap.reduce((a, r) => a + r.likes, 0),
    comments: snap.reduce((a, r) => a + r.comments, 0),
    shares: snap.reduce((a, r) => a + r.shares, 0),
    followers: snap.reduce((a, r) => a + r.followers_delta, 0),
  };

  // Daily total views series (cumulative across syncs by day).
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const day = r.collected_at.slice(0, 10);
    byDay.set(day, Math.max(byDay.get(day) ?? 0, 0) + r.views);
  }
  const series = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, views]) => ({ date: format(new Date(day), "MMM d"), views }));

  const platformTotals = new Map<Platform, number>();
  for (const r of snap) {
    platformTotals.set(r.platform, (platformTotals.get(r.platform) ?? 0) + r.views);
  }
  const byPlatform = [...platformTotals.entries()]
    .map(([platform, views]) => ({ platform, label: PLATFORM_LABELS[platform], views }))
    .sort((a, b) => b.views - a.views);

  const projById = new Map(projects.map((p) => [p.id, p]));
  const topVideos = snap
    .filter((r) => r.project_id)
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)
    .map((r) => ({
      projectId: r.project_id!,
      title: projById.get(r.project_id!)?.title ?? "Untitled",
      thumbnail: projById.get(r.project_id!)?.thumbnail_url ?? null,
      platform: r.platform,
      views: r.views,
      watchPct: r.avg_watch_pct,
    }));

  return { latest, series, byPlatform, topVideos };
}
