"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CloudUpload,
  FolderOpen,
  Loader2,
  MessageSquareText,
  Music2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VideoPlayer } from "@/components/queue/video-player";
import { Timeline } from "@/components/studio/timeline";
import {
  AssetLibrary,
  AudioControls,
  SceneInspector,
  SubtitleEditor,
} from "@/components/studio/inspector";
import { AiChatPanel } from "@/components/studio/ai-chat";
import { useProjectBundle, useReviewProject, useSaveTimeline } from "@/hooks/use-queries";
import { useWorkspaceRealtime } from "@/hooks/use-realtime";
import { useEditorStore } from "@/stores/editor";
import { buildSubtitles, emptyTimeline, timelineDuration } from "@/lib/timeline";
import type { TimelineDoc, VideoProject } from "@/lib/types";
import { useQueueStore } from "@/stores/queue";

type Panel = "edit" | "captions" | "audio" | "assets" | "ai";

export default function StudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();
  const { data, isLoading } = useProjectBundle(projectId);
  const save = useSaveTimeline();
  const review = useReviewProject();
  const { doc, dirty, setDoc, updateDoc, undo, markSaved, history, reset } = useEditorStore();
  const { muted, setMuted } = useQueueStore();
  const [panel, setPanel] = useState<Panel>("edit");

  useWorkspaceRealtime();

  // Load the document once per project.
  useEffect(() => {
    reset();
  }, [projectId, reset]);

  useEffect(() => {
    if (!data?.project || doc) return;
    const t = data.project.timeline as TimelineDoc;
    setDoc(t && Array.isArray(t.scenes) ? t : emptyTimeline());
  }, [data?.project, doc, setDoc]);

  // Autosave (debounced) + ⌘S.
  useEffect(() => {
    if (!dirty || !doc) return;
    const t = setTimeout(() => {
      const synced: TimelineDoc = { ...doc, subtitles: buildSubtitles(doc.scenes) };
      save.mutate(
        { id: projectId, timeline: synced, duration: timelineDuration(synced) },
        { onSuccess: () => markSaved() },
      );
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, dirty, projectId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (doc) {
          save.mutate(
            { id: projectId, timeline: doc, duration: timelineDuration(doc) },
            { onSuccess: () => markSaved() },
          );
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doc, projectId, save, markSaved, undo]);

  // Live preview project — current edits, not the saved row.
  const previewProject = useMemo<VideoProject | null>(() => {
    if (!data?.project) return null;
    return { ...data.project, timeline: (doc ?? data.project.timeline) as VideoProject["timeline"], final_video_url: null };
  }, [data?.project, doc]);

  if (isLoading || !data?.project) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Skeleton className="size-8" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="aspect-[9/16] h-[70%] rounded-2xl" />
        </div>
      </div>
    );
  }

  const project = data.project;
  const sendableBack = ["changes_requested", "editing", "approved"].includes(project.status);

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[14px] font-semibold tracking-tight">{project.title}</h1>
          <p className="text-[11px] text-muted-foreground tnum">
            {doc ? `${doc.scenes.length} scenes · ${Math.round(timelineDuration(doc))}s` : "—"} ·{" "}
            {save.isPending ? "saving…" : dirty ? "unsaved changes" : "saved"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={undo} disabled={history.length === 0} aria-label="Undo">
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-1.5">
              Undo <Kbd>⌘Z</Kbd>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="secondary"
            size="sm"
            disabled={save.isPending || !doc}
            onClick={() =>
              doc &&
              save.mutate(
                { id: projectId, timeline: doc, duration: timelineDuration(doc) },
                { onSuccess: () => markSaved() },
              )
            }
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : <CloudUpload />}
            Save
          </Button>
          {sendableBack ? (
            <Button
              size="sm"
              disabled={review.isPending}
              onClick={() =>
                review.mutate(
                  { id: projectId, action: "request_changes", note: "Manual edit pass in Studio — re-run captions and pacing check, then return to queue." },
                  { onSuccess: () => toast.success("Sent through the editing pass — back in your queue soon.") },
                )
              }
            >
              <Sparkles /> Polish &amp; requeue
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/queue">
                <Check /> Review in queue
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--color-foreground)_4%,transparent),transparent_70%)] p-4">
          {previewProject && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="h-full max-h-[62dvh] lg:max-h-full"
            >
              <VideoPlayer
                key={doc?.version ?? 0}
                project={previewProject}
                muted={muted}
                onToggleMute={() => setMuted(!muted)}
                autoPlay
                className="h-full w-auto"
              />
            </motion.div>
          )}
        </div>

        {/* Right panel */}
        <aside className="flex h-[42dvh] w-full shrink-0 flex-col border-t border-border lg:h-auto lg:w-[360px] lg:border-l lg:border-t-0">
          <Tabs value={panel} onValueChange={(v) => setPanel(v as Panel)} className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border px-3 py-2">
              <TabsList className="w-full">
                <TabsTrigger value="edit" className="flex-1" title="Scene editor">
                  <SlidersHorizontal className="size-3.5" />
                </TabsTrigger>
                <TabsTrigger value="captions" className="flex-1" title="Subtitles">
                  <Type className="size-3.5" />
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex-1" title="Audio">
                  <Music2 className="size-3.5" />
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex-1" title="Asset library">
                  <FolderOpen className="size-3.5" />
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex-1" title="AI editor">
                  <MessageSquareText className="size-3.5" />
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="min-h-0 flex-1">
              {panel === "ai" ? (
                <AiChatPanel projectId={projectId} />
              ) : (
                <ScrollArea className="h-full">
                  {doc && panel === "edit" && <SceneInspector doc={doc} project={project} />}
                  {doc && panel === "captions" && <SubtitleEditor doc={doc} />}
                  {doc && panel === "audio" && <AudioControls doc={doc} />}
                  {panel === "assets" && (
                    <AssetLibrary
                      clips={data.clips}
                      references={data.references}
                      onUseClip={(clip) =>
                        updateDoc((d) => {
                          const selected = useEditorStore.getState().selectedSceneId;
                          const scene = d.scenes.find((s) => s.id === selected) ?? d.scenes[0];
                          if (scene && clip.url) {
                            scene.clip_url = clip.url;
                            scene.thumbnail_url = clip.thumbnail_url;
                          }
                          return d;
                        })
                      }
                    />
                  )}
                </ScrollArea>
              )}
            </div>
          </Tabs>
        </aside>
      </div>

      {/* Timeline */}
      {doc && <Timeline doc={doc} />}
    </div>
  );
}
