"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PlatformIcon } from "@/components/publishing/platform-icons";
import {
  useConnectPlatform,
  useConnections,
  useDisconnectPlatform,
  useProjects,
  usePublishProject,
  usePublishingJobs,
} from "@/hooks/use-queries";
import {
  PLATFORM_LABELS,
  type Platform,
  type PublishStatus,
  type PublishingJob,
  type VideoProject,
} from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { fadeUp, staggerChildren } from "@/lib/motion";

const ALL_PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "facebook"];

const STATUS_BADGE: Record<PublishStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-secondary text-secondary-foreground" },
  scheduled: { label: "Scheduled", cls: "bg-chart-2/15 text-chart-2" },
  publishing: { label: "Publishing", cls: "bg-primary/15 text-primary" },
  published: { label: "Live", cls: "bg-success/15 text-success" },
  failed: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
  canceled: { label: "Canceled", cls: "bg-secondary text-muted-foreground" },
};

export default function PublishingPage() {
  const { data: connections, isLoading: connsLoading } = useConnections();
  const { data: jobs, isLoading: jobsLoading } = usePublishingJobs();
  const { data: approvedProjects } = useProjects(["approved"]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<VideoProject | null>(null);

  const upcoming = useMemo(
    () =>
      (jobs ?? [])
        .filter((j) => j.status === "scheduled" || j.status === "publishing")
        .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")),
    [jobs],
  );
  const history = useMemo(
    () => (jobs ?? []).filter((j) => ["published", "failed"].includes(j.status)).slice(0, 30),
    [jobs],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Publishing Center"
        description="Connections, schedule and everything that has shipped."
        actions={
          <Button variant="secondary" onClick={() => setConnectOpen(true)}>
            <Plus /> Connect platform
          </Button>
        }
      />

      <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="mt-6 space-y-4">
        {/* Connections */}
        <motion.div variants={fadeUp} custom={0}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Connected platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connsLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-4">
                  {ALL_PLATFORMS.map((platform) => {
                    const conn = (connections ?? []).find((c) => c.platform === platform);
                    return (
                      <ConnectionTile
                        key={platform}
                        platform={platform}
                        handle={conn?.handle}
                        connectionId={conn?.id}
                        onConnect={() => setConnectOpen(true)}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Ready to publish */}
        {(approvedProjects ?? []).length > 0 && (
          <motion.div variants={fadeUp} custom={1}>
            <Card className="border-primary/25">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-primary">
                  Approved · ready to publish
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(approvedProjects ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3"
                  >
                    <Thumb url={p.thumbnail_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{p.title}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        approved {p.approved_at ? timeAgo(p.approved_at) : ""}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setPublishTarget(p)}>
                      <Send /> Publish
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Upcoming */}
        <motion.div variants={fadeUp} custom={2}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="size-3.5" /> Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <Skeleton className="h-24" />
              ) : upcoming.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-muted-foreground">
                  Nothing scheduled. Approve videos in the queue — they schedule automatically.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* History */}
        <motion.div variants={fadeUp} custom={3}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Shipped
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-muted-foreground">
                  Published videos appear here with live links.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      <PublishDialog project={publishTarget} onClose={() => setPublishTarget(null)} />
    </PageContainer>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="h-12 w-8 shrink-0 overflow-hidden rounded-md bg-zinc-950">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : null}
    </div>
  );
}

function ConnectionTile({
  platform,
  handle,
  connectionId,
  onConnect,
}: {
  platform: Platform;
  handle?: string;
  connectionId?: string;
  onConnect: () => void;
}) {
  const disconnect = useDisconnectPlatform();
  const connected = Boolean(handle);
  return (
    <div
      className={cn(
        "group relative rounded-xl border p-3.5 transition-colors",
        connected ? "border-border bg-background/50" : "border-dashed border-border/70",
      )}
    >
      <div className="flex items-center gap-2.5">
        <PlatformIcon platform={platform} className={cn(!connected && "opacity-40 grayscale")} />
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold">{PLATFORM_LABELS[platform]}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {connected ? handle : "Not connected"}
          </div>
        </div>
        {connected ? (
          <button
            onClick={() => connectionId && disconnect.mutate(connectionId)}
            className="rounded-md p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            aria-label="Disconnect"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : (
          <button onClick={onConnect} className="rounded-md p-1 text-primary" aria-label="Connect">
            <Link2 className="size-4" />
          </button>
        )}
      </div>
      {connected && (
        <span className="absolute right-2 top-2 size-1.5 rounded-full bg-success" aria-hidden />
      )}
    </div>
  );
}

function JobRow({ job }: { job: PublishingJob }) {
  const badge = STATUS_BADGE[job.status];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3">
      <PlatformIcon platform={job.platform} />
      <Thumb url={job.project?.thumbnail_url ?? null} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{job.project?.title ?? job.caption}</p>
        <p className="text-[11.5px] text-muted-foreground tnum">
          {job.status === "published" && job.published_at
            ? `live · ${timeAgo(job.published_at)}`
            : job.scheduled_at
              ? format(new Date(job.scheduled_at), "EEE MMM d · h:mm a")
              : "—"}
          {job.error ? ` · ${job.error.slice(0, 60)}` : ""}
        </p>
      </div>
      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", badge.cls)}>
        {badge.label}
      </span>
      {job.external_url && job.status === "published" && (
        <a
          href={job.external_url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Open post"
        >
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}

function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [handle, setHandle] = useState("");
  const connect = useConnectPlatform();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a platform</DialogTitle>
          <DialogDescription>
            Publishing, scheduling and analytics for TikTok, Instagram Reels, YouTube Shorts and
            Facebook Reels. Runs in sandbox until platform OAuth credentials are configured.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <PlatformIcon platform={p} className="size-4" /> {PLATFORM_LABELS[p]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="handle">Account handle</Label>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@yourbrand"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={handle.trim().length < 2 || connect.isPending}
            onClick={() =>
              connect.mutate(
                { platform, handle: handle.trim() },
                { onSuccess: () => { onOpenChange(false); setHandle(""); } },
              )
            }
          >
            {connect.isPending ? <Loader2 className="animate-spin" /> : <Check />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublishDialog({ project, onClose }: { project: VideoProject | null; onClose: () => void }) {
  const { data: connections } = useConnections();
  const publish = usePublishProject();
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState("");

  const conns = connections ?? [];

  return (
    <Dialog open={Boolean(project)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish “{project?.title}”</DialogTitle>
          <DialogDescription>Pick destinations, polish the caption, ship it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Destinations</Label>
            <div className="grid grid-cols-2 gap-2">
              {conns.length === 0 && (
                <p className="col-span-2 text-[12.5px] text-muted-foreground">
                  No platforms connected yet — connect one first.
                </p>
              )}
              {conns.map((c) => {
                const active = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelected((s) => (active ? s.filter((id) => id !== c.id) : [...s, c.id]))
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2.5 text-left text-[12.5px] font-medium transition-colors",
                      active ? "border-primary bg-primary/8" : "border-border hover:border-foreground/25",
                    )}
                  >
                    <PlatformIcon platform={c.platform} className="size-4" />
                    <span className="truncate">{c.handle}</span>
                    {active && <Check className="ml-auto size-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={project?.title}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="when">
              Schedule <span className="text-muted-foreground">(leave empty to publish now)</span>
            </Label>
            <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0 || publish.isPending}
            onClick={() =>
              project &&
              publish.mutate(
                {
                  project_id: project.id,
                  connection_ids: selected,
                  caption: caption || undefined,
                  scheduled_at: when ? new Date(when).toISOString() : undefined,
                },
                { onSuccess: () => { onClose(); setSelected([]); setCaption(""); setWhen(""); } },
              )
            }
          >
            {publish.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            {when ? "Schedule" : "Publish now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
