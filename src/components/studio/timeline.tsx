"use client";

import { Reorder } from "framer-motion";
import { Clapperboard, GripVertical } from "lucide-react";
import type { TimelineDoc, TimelineScene } from "@/lib/types";
import { useEditorStore } from "@/stores/editor";
import { cn, formatDuration } from "@/lib/utils";

const TRANSITION_GLYPH: Record<TimelineScene["transition"], string> = {
  cut: "∣",
  fade: "◐",
  slide: "⇆",
  zoom: "⤢",
  whip: "↯",
};

/** Horizontal scene timeline — drag to reorder, click to select. */
export function Timeline({ doc }: { doc: TimelineDoc }) {
  const { selectedSceneId, selectScene, updateDoc } = useEditorStore();
  const total = doc.scenes.reduce((a, s) => a + s.duration, 0);

  return (
    <div className="border-t border-border bg-sidebar/80 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[11.5px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Timeline</span>
        <span className="tnum">
          {doc.scenes.length} scenes · {formatDuration(total)}
        </span>
      </div>
      <Reorder.Group
        axis="x"
        values={doc.scenes.map((s) => s.id)}
        onReorder={(ids: string[]) =>
          updateDoc((d) => {
            const byId = new Map(d.scenes.map((s) => [s.id, s]));
            d.scenes = ids.map((id, i) => ({ ...byId.get(id)!, index: i }));
            return d;
          })
        }
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
      >
        {doc.scenes.map((scene) => (
          <Reorder.Item
            key={scene.id}
            value={scene.id}
            whileDrag={{ scale: 1.04, zIndex: 10 }}
            onClick={() => selectScene(scene.id)}
            className={cn(
              "group relative flex h-20 shrink-0 cursor-grab select-none overflow-hidden rounded-lg border-2 bg-zinc-950 transition-colors active:cursor-grabbing",
              selectedSceneId === scene.id
                ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_25%,transparent)]"
                : "border-border/70 hover:border-foreground/30",
            )}
            style={{ width: Math.max(72, Math.min(220, scene.duration * 16)) }}
          >
            {scene.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scene.thumbnail_url} alt="" className="size-full object-cover opacity-80" draggable={false} />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Clapperboard className="size-4 text-zinc-700" />
              </div>
            )}
            <span className="absolute left-1 top-1 rounded bg-black/65 px-1 text-[10px] font-bold text-white tnum">
              {scene.index + 1}
            </span>
            <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1 text-[10px] font-medium text-white tnum">
              {scene.duration.toFixed(1)}s
            </span>
            <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[11px] text-white/85" title={`Transition: ${scene.transition}`}>
              {TRANSITION_GLYPH[scene.transition]}
            </span>
            <GripVertical className="absolute right-0.5 top-1 size-3.5 text-white/40 opacity-0 transition-opacity group-hover:opacity-100" />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
