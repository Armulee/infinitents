"use client";

import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEnqueueStage } from "@/hooks/use-queries";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { GeneratedVideo, TimelineDoc, TimelineScene, VideoProject } from "@/lib/types";
import { useEditorStore } from "@/stores/editor";

const TRANSITIONS: TimelineScene["transition"][] = ["cut", "fade", "slide", "zoom", "whip"];
const VOICES: TimelineDoc["audio"]["voice"][] = [
  "female_energetic",
  "female_warm",
  "male_warm",
  "male_deep",
  "narrator",
];
const MUSIC_TRACKS = ["uplift-minimal", "dark-pulse", "warm-acoustic", "future-bass", "none"];

/** Scene Editor — per-scene properties + partial regeneration. */
export function SceneInspector({
  doc,
  project,
}: {
  doc: TimelineDoc;
  project: VideoProject;
}) {
  const { selectedSceneId, updateDoc, selectScene } = useEditorStore();
  const enqueue = useEnqueueStage();
  const scene = doc.scenes.find((s) => s.id === selectedSceneId) ?? doc.scenes[0];
  if (!scene) {
    return <p className="p-4 text-[13px] text-muted-foreground">No scenes in this timeline yet.</p>;
  }

  async function regenerateScene() {
    const supabase = supabaseBrowser();
    const { data: clip, error } = await supabase
      .from("generated_videos")
      .insert({
        workspace_id: project.workspace_id,
        project_id: project.id,
        scene_index: scene!.index,
        prompt: `${scene!.visual_direction ?? scene!.voiceover}. Premium commercial grade, 9:16 vertical video.`,
        provider: "seedance",
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !clip) {
      toast.error(error?.message ?? "Could not start regeneration");
      return;
    }
    enqueue.mutate(
      {
        stage: "video_generation",
        payload: {
          project_id: project.id,
          generated_video_id: (clip as { id: string }).id,
          duration_s: scene!.duration,
        },
        project_id: project.id,
      },
      {
        onSuccess: () =>
          toast.success(`Regenerating scene ${scene!.index + 1}`, {
            description: "The new clip will drop into the timeline when ready.",
          }),
      },
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Scene {scene.index + 1}
        </div>
        {scene.visual_direction && (
          <p className="mt-1.5 text-[12.5px] italic leading-relaxed text-muted-foreground">
            {scene.visual_direction}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label>Duration</Label>
          <span className="text-[12.5px] font-semibold text-primary tnum">
            {scene.duration.toFixed(1)}s
          </span>
        </div>
        <Slider
          min={1}
          max={15}
          step={0.5}
          value={[scene.duration]}
          onValueChange={([v]) =>
            updateDoc((d) => {
              const s = d.scenes.find((x) => x.id === scene.id);
              if (s) s.duration = v;
              return d;
            })
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label>Transition in</Label>
        <Select
          value={scene.transition}
          onValueChange={(v) =>
            updateDoc((d) => {
              const s = d.scenes.find((x) => x.id === scene.id);
              if (s) s.transition = v as TimelineScene["transition"];
              return d;
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Voiceover</Label>
        <Textarea
          value={scene.voiceover}
          rows={3}
          onChange={(e) =>
            updateDoc((d) => {
              const s = d.scenes.find((x) => x.id === scene.id);
              if (s) s.voiceover = e.target.value;
              return d;
            })
          }
        />
        <p className="text-[11px] text-muted-foreground">Captions re-time automatically on save.</p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={regenerateScene} disabled={enqueue.isPending}>
          {enqueue.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
          Regenerate clip
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          disabled={doc.scenes.length <= 1}
          onClick={() => {
            updateDoc((d) => {
              d.scenes = d.scenes.filter((x) => x.id !== scene.id).map((s, i) => ({ ...s, index: i }));
              return d;
            });
            selectScene(null);
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

/** Subtitle Editor — text + emphasis + caption styling. */
export function SubtitleEditor({ doc }: { doc: TimelineDoc }) {
  const { updateDoc } = useEditorStore();
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Style</Label>
          <Select
            value={doc.caption_style.style}
            onValueChange={(v) =>
              updateDoc((d) => {
                d.caption_style.style = v as TimelineDoc["caption_style"]["style"];
                return d;
              })
            }
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["clean", "bold", "karaoke", "outline"] as const).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Size</Label>
          <Select
            value={doc.caption_style.size}
            onValueChange={(v) =>
              updateDoc((d) => {
                d.caption_style.size = v as TimelineDoc["caption_style"]["size"];
                return d;
              })
            }
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["sm", "md", "lg"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Position</Label>
          <Select
            value={doc.caption_style.position}
            onValueChange={(v) =>
              updateDoc((d) => {
                d.caption_style.position = v as TimelineDoc["caption_style"]["position"];
                return d;
              })
            }
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["bottom", "center", "top"] as const).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        {doc.subtitles.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 p-2">
            <span className="w-14 shrink-0 text-[10.5px] text-muted-foreground tnum">
              {sub.start.toFixed(1)}–{sub.end.toFixed(1)}s
            </span>
            <input
              value={sub.text}
              onChange={(e) =>
                updateDoc((d) => {
                  const s = d.subtitles.find((x) => x.id === sub.id);
                  if (s) s.text = e.target.value;
                  return d;
                })
              }
              className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
            />
            <button
              title="Emphasis"
              onClick={() =>
                updateDoc((d) => {
                  const s = d.subtitles.find((x) => x.id === sub.id);
                  if (s) s.emphasis = !s.emphasis;
                  return d;
                })
              }
              className={`rounded px-1.5 text-[11px] font-bold transition-colors ${
                sub.emphasis ? "bg-warning/20 text-warning" : "text-muted-foreground/50 hover:text-foreground"
              }`}
            >
              Aa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Audio Controls — narrator voice, music, levels, ducking. */
export function AudioControls({ doc }: { doc: TimelineDoc }) {
  const { updateDoc } = useEditorStore();
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-1.5">
        <Label>Narrator voice</Label>
        <Select
          value={doc.audio.voice}
          onValueChange={(v) =>
            updateDoc((d) => {
              d.audio.voice = v as TimelineDoc["audio"]["voice"];
              return d;
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICES.map((v) => (
              <SelectItem key={v} value={v}>
                {v.replace("_", " · ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Music</Label>
        <Select
          value={doc.audio.music_track ?? "none"}
          onValueChange={(v) =>
            updateDoc((d) => {
              d.audio.music_track = v === "none" ? null : v;
              return d;
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MUSIC_TRACKS.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "none" ? "No music" : t.replace("-", " · ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <VolumeRow
        label="Voiceover level"
        value={doc.audio.voiceover_volume}
        onChange={(v) =>
          updateDoc((d) => {
            d.audio.voiceover_volume = v;
            return d;
          })
        }
      />
      <VolumeRow
        label="Music level"
        value={doc.audio.music_volume}
        onChange={(v) =>
          updateDoc((d) => {
            d.audio.music_volume = v;
            return d;
          })
        }
      />

      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3.5 py-2.5">
        <div>
          <div className="text-[13px] font-medium">Auto-ducking</div>
          <div className="text-[11.5px] text-muted-foreground">Lower music under the narrator</div>
        </div>
        <Switch
          checked={doc.audio.ducking}
          onCheckedChange={(v) =>
            updateDoc((d) => {
              d.audio.ducking = v;
              return d;
            })
          }
        />
      </div>
    </div>
  );
}

function VolumeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-[12px] text-muted-foreground tnum">{Math.round(value * 100)}%</span>
      </div>
      <Slider min={0} max={1} step={0.05} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

/** Asset Library — generated clips + image references for this project. */
export function AssetLibrary({
  clips,
  references,
  onUseClip,
}: {
  clips: GeneratedVideo[];
  references: { id: string; url: string | null; kind: string }[];
  onUseClip: (clip: GeneratedVideo) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Generated clips
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {clips.map((clip) => (
            <button
              key={clip.id}
              onClick={() => onUseClip(clip)}
              title={`Use in selected scene (S${clip.scene_index + 1})`}
              className="group relative aspect-[9/16] overflow-hidden rounded-lg border border-border/70 bg-zinc-950 transition-transform active:scale-95"
            >
              {clip.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clip.thumbnail_url} alt="" className="size-full object-cover transition-opacity group-hover:opacity-75" />
              ) : (
                <div className="flex size-full items-center justify-center text-[10px] text-zinc-600">
                  {clip.status}
                </div>
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[10px] text-white tnum">
                S{clip.scene_index + 1}
              </span>
            </button>
          ))}
          {clips.length === 0 && (
            <p className="col-span-3 text-[12px] text-muted-foreground">No clips yet.</p>
          )}
        </div>
      </div>
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Image references
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {references.map((ref) => (
            <div key={ref.id} className="relative aspect-[9/16] overflow-hidden rounded-lg border border-border/70 bg-zinc-950">
              {ref.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ref.url} alt={ref.kind} className="size-full object-cover" />
              ) : null}
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[10px] capitalize text-white">
                {ref.kind}
              </span>
            </div>
          ))}
          {references.length === 0 && (
            <p className="col-span-3 text-[12px] text-muted-foreground">No references yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
