import type {
  GeneratedVideo,
  Script,
  ScriptScene,
  Storyboard,
  Subtitle,
  TimelineDoc,
  TimelineScene,
} from "@/lib/types";

/** Split voiceover into caption chunks (~4 words) timed across the scene. */
export function buildSubtitles(scenes: TimelineScene[]): Subtitle[] {
  const subtitles: Subtitle[] = [];
  let offset = 0;
  for (const scene of scenes) {
    const words = scene.voiceover.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      offset += scene.duration;
      continue;
    }
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4).join(" "));
    const per = scene.duration / chunks.length;
    chunks.forEach((text, i) => {
      subtitles.push({
        id: `sub_${scene.index}_${i}`,
        start: round2(offset + i * per),
        end: round2(offset + (i + 1) * per),
        text,
        emphasis: scene.index === 0 && i === 0,
      });
    });
    offset += scene.duration;
  }
  return subtitles;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Assemble the editor document from pipeline artifacts. */
export function assembleTimeline(
  script: Pick<Script, "scenes">,
  storyboard: Pick<Storyboard, "scenes"> | null,
  clips: Pick<GeneratedVideo, "scene_index" | "url" | "thumbnail_url" | "duration_seconds">[],
): TimelineDoc {
  const clipByScene = new Map(clips.map((c) => [c.scene_index, c]));
  const scenes: TimelineScene[] = (script.scenes as ScriptScene[]).map((s, i) => {
    const clip = clipByScene.get(s.index ?? i);
    const board = storyboard?.scenes?.[i];
    return {
      id: `scene_${i}`,
      index: i,
      clip_url: clip?.url ?? null,
      thumbnail_url: clip?.thumbnail_url ?? null,
      trim_start: 0,
      duration: s.duration_s || clip?.duration_seconds || 5,
      transition: i === 0 ? "cut" : transitionFromNote(board?.transition_note),
      voiceover: s.voiceover,
      visual_direction: s.visual_direction,
    };
  });

  return {
    version: 1,
    scenes,
    subtitles: buildSubtitles(scenes),
    audio: {
      music_track: "uplift-minimal",
      music_volume: 0.25,
      voiceover_volume: 1,
      voice: "female_energetic",
      ducking: true,
    },
    caption_style: { font: "Inter", size: "md", position: "bottom", style: "bold" },
  };
}

function transitionFromNote(note?: string): TimelineScene["transition"] {
  const n = (note ?? "").toLowerCase();
  if (n.includes("whip") || n.includes("swish")) return "whip";
  if (n.includes("zoom") || n.includes("punch")) return "zoom";
  if (n.includes("slide")) return "slide";
  if (n.includes("fade") || n.includes("dissolve")) return "fade";
  return "cut";
}

export function timelineDuration(doc: TimelineDoc): number {
  return doc.scenes.reduce((acc, s) => acc + s.duration, 0);
}

export function emptyTimeline(): TimelineDoc {
  return {
    version: 1,
    scenes: [],
    subtitles: [],
    audio: {
      music_track: null,
      music_volume: 0.3,
      voiceover_volume: 1,
      voice: "female_energetic",
      ducking: true,
    },
    caption_style: { font: "Inter", size: "md", position: "bottom", style: "bold" },
  };
}
