"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { TimelineDoc, VideoProject } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Review player — plays the final render when present, otherwise stitches the
 * scene clips client-side with timed captions from the timeline document.
 */
export function VideoPlayer({
  project,
  muted,
  onToggleMute,
  autoPlay = true,
  className,
  onDoubleTap,
}: {
  project: VideoProject;
  muted: boolean;
  onToggleMute?: () => void;
  autoPlay?: boolean;
  className?: string;
  onDoubleTap?: () => void;
}) {
  const doc = useMemo<TimelineDoc | null>(() => {
    const t = project.timeline as TimelineDoc;
    return t && Array.isArray(t.scenes) && t.scenes.length > 0 ? t : null;
  }, [project.timeline]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [elapsedBefore, setElapsedBefore] = useState(0); // seconds in completed scenes
  const [sceneTime, setSceneTime] = useState(0);
  const lastTap = useRef(0);

  const scenes = useMemo(() => doc?.scenes ?? [], [doc]);
  const isFinalRender = Boolean(project.final_video_url);
  const totalDuration = useMemo(
    () =>
      isFinalRender
        ? (project.duration_seconds ?? 30)
        : scenes.reduce((acc, s) => acc + s.duration, 0),
    [isFinalRender, project.duration_seconds, scenes],
  );

  const scene = scenes[sceneIndex];
  const globalTime = isFinalRender ? sceneTime : elapsedBefore + sceneTime;

  const advance = useCallback(() => {
    if (isFinalRender) return;
    setSceneIndex((i) => {
      const next = i + 1 < scenes.length ? i + 1 : 0;
      setElapsedBefore(next === 0 ? 0 : scenes.slice(0, next).reduce((a, s) => a + s.duration, 0));
      setSceneTime(0);
      return next;
    });
  }, [isFinalRender, scenes]);

  // Reset when the project changes.
  useEffect(() => {
    setSceneIndex(0);
    setElapsedBefore(0);
    setSceneTime(0);
    setPlaying(autoPlay);
  }, [project.id, autoPlay]);

  // Drive playback + scene advancement.
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (playing) video.play().catch(() => setPlaying(false));
      else video.pause();
    }
    if (!playing || video) return;
    // No clip for this scene — simulate time so captions/progress still run.
    const id = setInterval(() => {
      setSceneTime((t) => {
        const limit = scene?.duration ?? 5;
        if (t + 0.1 >= limit) {
          advance();
          return 0;
        }
        return t + 0.1;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, scene, sceneIndex, advance]);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !scene) return;
    const t = video.currentTime - (isFinalRender ? 0 : scene.trim_start);
    setSceneTime(Math.max(0, t));
    if (!isFinalRender && t >= scene.duration) advance();
  };

  const subtitle = useMemo(() => {
    if (!doc) return null;
    return doc.subtitles.find((s) => globalTime >= s.start && globalTime < s.end) ?? null;
  }, [doc, globalTime]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280 && onDoubleTap) {
      onDoubleTap();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    setTimeout(() => {
      if (lastTap.current === now) setPlaying((p) => !p);
    }, 285);
  };

  const src = isFinalRender ? project.final_video_url! : (scene?.clip_url ?? null);

  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-full select-none overflow-hidden rounded-2xl bg-zinc-950",
        className,
      )}
      onClick={handleTap}
    >
      {/* media */}
      {src ? (
        <video
          ref={videoRef}
          key={`${project.id}-${isFinalRender ? "final" : sceneIndex}`}
          src={src}
          muted={muted}
          playsInline
          autoPlay={playing}
          loop={isFinalRender}
          onTimeUpdate={onTimeUpdate}
          onEnded={advance}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8">
          <p className="text-center text-[13px] leading-relaxed text-zinc-400">
            {scene?.visual_direction ?? "Scene preview"}
          </p>
        </div>
      )}

      {/* story-style scene progress */}
      <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
        {(isFinalRender ? [{ duration: totalDuration }] : scenes).map((s, i) => {
          const pct = i < sceneIndex ? 100 : i === sceneIndex ? Math.min(100, (sceneTime / s.duration) * 100) : 0;
          return (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-150 ease-linear" style={{ width: `${pct}%` }} />
            </div>
          );
        })}
      </div>

      {/* captions */}
      <AnimatePresence mode="popLayout">
        {subtitle && (
          <motion.div
            key={subtitle.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={cn(
              "pointer-events-none absolute inset-x-5 z-20 text-center",
              doc?.caption_style.position === "top"
                ? "top-12"
                : doc?.caption_style.position === "center"
                  ? "top-1/2 -translate-y-1/2"
                  : "bottom-24",
            )}
          >
            <span
              className={cn(
                "inline-block rounded-lg px-2.5 py-1 font-bold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]",
                doc?.caption_style.size === "lg" ? "text-xl" : doc?.caption_style.size === "sm" ? "text-sm" : "text-base",
                subtitle.emphasis && "text-amber-300",
                doc?.caption_style.style === "outline" && "[-webkit-text-stroke:1px_black]",
              )}
            >
              {subtitle.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* play state flash */}
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="rounded-full bg-black/55 p-5 backdrop-blur-sm">
              <Play className="size-8 fill-white text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom meta + controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4 pt-16">
        <div className="line-clamp-2 pr-12 text-[14.5px] font-semibold leading-snug text-white">
          {project.title}
        </div>
        <div className="mt-1 text-[11.5px] text-white/65 tnum">
          {Math.round(totalDuration)}s · {isFinalRender ? "final render" : `${scenes.length} scenes`} ·{" "}
          {project.aspect_ratio}
        </div>
      </div>

      <div className="absolute bottom-3.5 right-3 z-20 flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPlaying((p) => !p);
          }}
          className="rounded-full bg-black/45 p-2.5 text-white backdrop-blur-sm transition-transform active:scale-90"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        {onToggleMute && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="rounded-full bg-black/45 p-2.5 text-white backdrop-blur-sm transition-transform active:scale-90"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
