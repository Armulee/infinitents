"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Check,
  Loader2,
  MessageSquareMore,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { VideoProject } from "@/lib/types";
import { useReviewProject } from "@/hooks/use-queries";
import { useQueueStore, type ReviewAction } from "@/stores/queue";
import { VideoPlayer } from "./video-player";

const SWIPE_THRESHOLD = 110;

export function QueueDeck({ projects }: { projects: VideoProject[] }) {
  const router = useRouter();
  const review = useReviewProject();
  const { reviewed, markReviewed, unmarkReviewed, muted, setMuted } = useQueueStore();
  const [changesOpen, setChangesOpen] = useState(false);
  const [note, setNote] = useState("");

  const deck = useMemo(() => projects.filter((p) => !reviewed[p.id]), [projects, reviewed]);
  const active = deck[0] ?? null;
  const activeRef = useRef(active);
  activeRef.current = active;

  // ── swipe physics ──────────────────────────────────────────────────────────
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-9, 9]);
  const approveOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const changesOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const controls = useAnimationControls();

  const act = useCallback(
    (action: ReviewAction, noteText?: string) => {
      const project = activeRef.current;
      if (!project) return;
      markReviewed(project.id, action);

      review.mutate(
        { id: project.id, action, note: noteText },
        {
          onError: () => unmarkReviewed(project.id),
          onSuccess: (data) => {
            const labels: Record<ReviewAction, string> = {
              approve: data.status === "scheduled" ? "Approved — scheduled to publish" : "Approved",
              reject: "Rejected and archived",
              request_changes: "Changes requested — AI is revising",
              regenerate: "Regenerating from storyboard",
            };
            toast(labels[action], {
              action:
                action === "approve" || action === "reject"
                  ? {
                      label: "Undo",
                      onClick: async () => {
                        const supabase = supabaseBrowser();
                        await supabase
                          .from("publishing_jobs")
                          .delete()
                          .eq("project_id", project.id)
                          .eq("status", "scheduled");
                        await supabase
                          .from("video_projects")
                          .update({ status: "ready_for_review", approved_at: null, approved_by: null })
                          .eq("id", project.id);
                        unmarkReviewed(project.id);
                      },
                    }
                  : undefined,
            });
          },
        },
      );
    },
    [markReviewed, unmarkReviewed, review],
  );

  const flyOut = useCallback(
    async (direction: 1 | -1, action: ReviewAction, noteText?: string) => {
      await controls.start({
        x: direction * 560,
        opacity: 0,
        transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
      });
      act(action, noteText);
      x.set(0);
      // Park the (now next) card in its hidden state; the enter effect animates it in.
      controls.set({ x: 0, opacity: 0, scale: 0.96, y: 10 });
    },
    [act, controls, x],
  );

  const onDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const power = info.offset.x + info.velocity.x * 0.18;
      if (power > SWIPE_THRESHOLD) {
        flyOut(1, "approve"); // swipe right → approve
      } else if (power < -SWIPE_THRESHOLD) {
        controls.start({ x: 0, transition: { type: "spring", stiffness: 420, damping: 34 } });
        setChangesOpen(true); // swipe left → request changes
      } else {
        controls.start({ x: 0, transition: { type: "spring", stiffness: 420, damping: 34 } });
      }
    },
    [controls, flyOut],
  );

  // Animate each new front card in (controls own the card, so initial alone
  // would leave it invisible).
  useEffect(() => {
    controls.start({
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: { type: "spring", stiffness: 380, damping: 32 },
    });
  }, [active?.id, controls]);

  // ── keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (changesOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (!activeRef.current) return;
      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          flyOut(1, "approve");
          break;
        case "r":
          e.preventDefault();
          setChangesOpen(true);
          break;
        case "x":
          e.preventDefault();
          flyOut(-1, "reject");
          break;
        case "g":
          e.preventDefault();
          flyOut(-1, "regenerate");
          break;
        case "e":
          e.preventDefault();
          router.push(`/studio/${activeRef.current.id}`);
          break;
        case "m":
          e.preventDefault();
          setMuted(!useQueueStore.getState().muted);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [changesOpen, flyOut, router, setMuted]);

  if (!active) return <EmptyQueue />;

  const upNext = deck.slice(1, 3);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
        {/* cards behind (TikTok-style stack) */}
        {upNext.map((p, i) => (
          <motion.div
            key={p.id}
            className="absolute inset-0 overflow-hidden rounded-2xl border border-border/60 bg-card"
            initial={false}
            animate={{ scale: 1 - (i + 1) * 0.045, y: (i + 1) * 14, opacity: 1 - (i + 1) * 0.35 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            style={{ zIndex: 2 - i }}
          >
            {p.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumbnail_url} alt="" className="size-full object-cover opacity-60" />
            ) : (
              <div className="size-full bg-gradient-to-br from-zinc-900 to-zinc-950" />
            )}
          </motion.div>
        ))}

        {/* active card */}
        <motion.div
          key={active.id}
          drag="x"
          dragElastic={0.65}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={onDragEnd}
          animate={controls}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          style={{ x, rotate, zIndex: 10 }}
          className="relative cursor-grab touch-pan-y active:cursor-grabbing"
        >
          <VideoPlayer
            project={active}
            muted={muted}
            onToggleMute={() => setMuted(!muted)}
            onDoubleTap={() => flyOut(1, "approve")}
          />

          {/* gesture stamps */}
          <motion.div
            style={{ opacity: approveOpacity }}
            className="pointer-events-none absolute left-4 top-12 z-30 -rotate-12 rounded-lg border-2 border-emerald-400 px-3 py-1 text-lg font-extrabold uppercase tracking-widest text-emerald-400"
          >
            Approve
          </motion.div>
          <motion.div
            style={{ opacity: changesOpacity }}
            className="pointer-events-none absolute right-4 top-12 z-30 rotate-12 rounded-lg border-2 border-amber-400 px-3 py-1 text-lg font-extrabold uppercase tracking-widest text-amber-400"
          >
            Changes
          </motion.div>
        </motion.div>
      </div>

      {/* action bar */}
      <div className="mt-6 flex items-center gap-3">
        <ActionButton
          label="Reject"
          kbd="X"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => flyOut(-1, "reject")}
        >
          <Trash2 className="size-5" />
        </ActionButton>
        <ActionButton
          label="Request changes"
          kbd="R"
          variant="outline"
          className="size-12 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
          onClick={() => setChangesOpen(true)}
        >
          <MessageSquareMore className="size-5" />
        </ActionButton>
        <ActionButton
          label="Approve"
          kbd="A"
          className="size-16 rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.7)] hover:bg-emerald-400"
          onClick={() => flyOut(1, "approve")}
          loading={review.isPending}
        >
          <Check className="size-7" strokeWidth={2.6} />
        </ActionButton>
        <ActionButton
          label="Regenerate"
          kbd="G"
          variant="outline"
          className="size-12"
          onClick={() => flyOut(-1, "regenerate")}
        >
          <RotateCcw className="size-5" />
        </ActionButton>
        <ActionButton
          label="Open in Studio"
          kbd="E"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => router.push(`/studio/${active.id}`)}
        >
          <Pencil className="size-5" />
        </ActionButton>
      </div>

      <p className="mt-4 hidden items-center gap-2 text-[12px] text-muted-foreground md:flex">
        Swipe right to approve · double-tap for quick approve · <Kbd>A</Kbd> approve <Kbd>R</Kbd>{" "}
        changes <Kbd>X</Kbd> reject <Kbd>E</Kbd> edit
      </p>
      <p className="mt-3 text-[12.5px] font-medium text-muted-foreground tnum md:mt-1.5">
        {deck.length} awaiting review
      </p>

      {/* request changes dialog */}
      <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Tell the AI editor what to fix — it revises the video and returns it to your queue.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='e.g. "Make the intro stronger and shorten to 20 seconds"'
            rows={3}
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {["Make the intro stronger", "Add suspense", "Use a female narrator", "Shorten to 20 seconds"].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setNote(s)}
                  className="rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {s}
                </button>
              ),
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChangesOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={note.trim().length < 3}
              onClick={() => {
                setChangesOpen(false);
                flyOut(-1, "request_changes", note.trim());
                setNote("");
              }}
            >
              <Sparkles /> Send to AI editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionButton({
  label,
  kbd,
  children,
  loading,
  className,
  variant = "default",
  onClick,
}: {
  label: string;
  kbd?: string;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon-lg" className={className} onClick={onClick} aria-label={label}>
          {loading ? <Loader2 className="size-5 animate-spin" /> : children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5">
        {label} {kbd && <Kbd>{kbd}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

function EmptyQueue() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-24 text-center"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl bg-success/12">
          <Check className="size-8 text-success" strokeWidth={2.4} />
        </div>
        <h2 className="mt-5 text-lg font-semibold tracking-tight">Queue zero</h2>
        <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
          Everything is reviewed. The factory keeps producing — new videos appear here the moment
          they&apos;re ready.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
