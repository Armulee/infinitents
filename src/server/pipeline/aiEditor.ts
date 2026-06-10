
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimelineDoc, TimelineScene, VideoProject, Workspace } from "@/lib/types";
import { buildSubtitles, emptyTimeline } from "@/lib/timeline";
import { getTextProvider } from "@/server/providers/registry";
import { enqueueJob } from "./enqueue";

/**
 * AI Editor — "Make the intro stronger", "Add suspense", "Use a female
 * narrator", "Shorten to 20 seconds". The model returns a list of edit
 * operations; we apply them to the timeline document directly.
 */

type EditOp =
  | { op: "trim_scene"; index: number; duration: number }
  | { op: "remove_scene"; index: number }
  | { op: "reorder_scene"; from: number; to: number }
  | { op: "set_transition"; index: number; transition: TimelineScene["transition"] }
  | { op: "set_voice"; voice: TimelineDoc["audio"]["voice"] }
  | { op: "set_music"; track: string; volume?: number }
  | { op: "set_caption_style"; style?: "clean" | "bold" | "karaoke" | "outline"; size?: "sm" | "md" | "lg"; position?: "bottom" | "center" | "top" }
  | { op: "rewrite_scene_voiceover"; index: number; voiceover: string }
  | { op: "shorten_total"; target_seconds: number }
  | { op: "regenerate_scene"; index: number; new_prompt: string };

interface EditPlan {
  summary: string;
  ops: EditOp[];
}

function heuristicPlan(instruction: string, doc: TimelineDoc): EditPlan {
  // Deterministic plan used as the MOCK_SHAPE example — also a sane few-shot
  // for real models. Maps the documented example instructions to real ops.
  const lower = instruction.toLowerCase();
  const ops: EditOp[] = [];
  const parts: string[] = [];

  const secondsMatch = lower.match(/(\d+)\s*(?:s|sec|seconds?)/);
  if (lower.includes("shorten") || lower.includes("shorter") || secondsMatch) {
    const target = secondsMatch ? parseInt(secondsMatch[1], 10) : 20;
    ops.push({ op: "shorten_total", target_seconds: target });
    parts.push(`tightened the cut to ~${target}s`);
  }
  if (lower.includes("female")) {
    ops.push({ op: "set_voice", voice: "female_warm" });
    parts.push("switched to a female narrator");
  } else if (lower.includes("male")) {
    ops.push({ op: "set_voice", voice: "male_deep" });
    parts.push("switched to a male narrator");
  }
  if (lower.includes("suspense") || lower.includes("tension") || lower.includes("dramatic")) {
    ops.push({ op: "set_music", track: "dark-pulse", volume: 0.35 });
    if (doc.scenes.length > 1) ops.push({ op: "set_transition", index: 1, transition: "zoom" });
    parts.push("added a suspenseful score and punch-in transitions");
  }
  if (lower.includes("intro") || lower.includes("hook") || lower.includes("stronger")) {
    if (doc.scenes[0]) {
      ops.push({
        op: "trim_scene",
        index: 0,
        duration: Math.max(2, Math.min(doc.scenes[0].duration, 2.5)),
      });
      ops.push({ op: "set_caption_style", style: "bold", size: "lg" });
      parts.push("punched up the intro: faster hook, bolder captions");
    }
  }
  if (lower.includes("caption") || lower.includes("subtitle")) {
    ops.push({ op: "set_caption_style", style: "karaoke", position: "center" });
    parts.push("restyled captions");
  }
  if (ops.length === 0 && doc.scenes.length > 1) {
    ops.push({ op: "set_transition", index: 1, transition: "fade" });
    parts.push("smoothed pacing between scenes");
  }
  return { summary: parts.join("; ") || "applied a light polish pass", ops };
}

export function applyOps(doc: TimelineDoc, ops: EditOp[]): { doc: TimelineDoc; regenerate: { index: number; prompt: string }[] } {
  const next: TimelineDoc = JSON.parse(JSON.stringify(doc));
  const regenerate: { index: number; prompt: string }[] = [];

  for (const op of ops) {
    switch (op.op) {
      case "trim_scene": {
        const s = next.scenes[op.index];
        if (s) s.duration = Math.max(1, Math.min(op.duration, 60));
        break;
      }
      case "remove_scene": {
        if (next.scenes.length > 1) next.scenes.splice(op.index, 1);
        break;
      }
      case "reorder_scene": {
        const [moved] = next.scenes.splice(op.from, 1);
        if (moved) next.scenes.splice(Math.min(op.to, next.scenes.length), 0, moved);
        break;
      }
      case "set_transition": {
        const s = next.scenes[op.index];
        if (s) s.transition = op.transition;
        break;
      }
      case "set_voice":
        next.audio.voice = op.voice;
        break;
      case "set_music":
        next.audio.music_track = op.track;
        if (typeof op.volume === "number") next.audio.music_volume = Math.max(0, Math.min(1, op.volume));
        break;
      case "set_caption_style":
        if (op.style) next.caption_style.style = op.style;
        if (op.size) next.caption_style.size = op.size;
        if (op.position) next.caption_style.position = op.position;
        break;
      case "rewrite_scene_voiceover": {
        const s = next.scenes[op.index];
        if (s) s.voiceover = op.voiceover;
        break;
      }
      case "shorten_total": {
        const total = next.scenes.reduce((a, s) => a + s.duration, 0);
        if (total > op.target_seconds && total > 0) {
          const factor = op.target_seconds / total;
          next.scenes.forEach((s) => {
            s.duration = Math.max(1.5, Math.round(s.duration * factor * 10) / 10);
          });
        }
        break;
      }
      case "regenerate_scene": {
        const s = next.scenes[op.index];
        if (s) regenerate.push({ index: op.index, prompt: op.new_prompt });
        break;
      }
    }
  }

  // Re-index and rebuild caption timing after structural edits.
  next.scenes.forEach((s, i) => {
    s.index = i;
  });
  next.subtitles = buildSubtitles(next.scenes);
  next.version = (next.version ?? 1) + 1;
  return { doc: next, regenerate };
}

export async function applyEditInstruction(input: {
  db: SupabaseClient;
  workspace: Workspace;
  project: VideoProject;
  instruction: string;
}): Promise<{ timeline: TimelineDoc; summary: string; regenerated: number[] }> {
  const { db, workspace, project, instruction } = input;
  const doc: TimelineDoc =
    project.timeline && Array.isArray((project.timeline as TimelineDoc).scenes)
      ? (project.timeline as TimelineDoc)
      : emptyTimeline();

  const provider = getTextProvider("editing", workspace.model_preferences);
  const example = heuristicPlan(instruction, doc);

  const plan = await provider.generateJSON<EditPlan>(
    `You are the AI editor for a short-form video project. Apply the user's instruction by emitting edit operations.

CURRENT TIMELINE:
${JSON.stringify({ scenes: doc.scenes.map((s) => ({ index: s.index, duration: s.duration, transition: s.transition, voiceover: s.voiceover })), audio: doc.audio, caption_style: doc.caption_style }, null, 2)}

USER INSTRUCTION:
"${instruction}"

Available ops: trim_scene{index,duration}, remove_scene{index}, reorder_scene{from,to}, set_transition{index,transition: cut|fade|slide|zoom|whip}, set_voice{voice: female_warm|female_energetic|male_warm|male_deep|narrator}, set_music{track,volume}, set_caption_style{style,size,position}, rewrite_scene_voiceover{index,voiceover}, shorten_total{target_seconds}, regenerate_scene{index,new_prompt}.

Return {"summary": "what you changed, one sentence, past tense", "ops": [...]}. Prefer minimal precise edits over rebuilds.

Return JSON with exactly this shape (example values shown):
MOCK_SHAPE:${JSON.stringify(example)}END_MOCK_SHAPE`,
    { temperature: 0.3, maxTokens: 4096 },
  );

  const { doc: nextDoc, regenerate } = applyOps(doc, plan.ops ?? []);

  // Partial regeneration — fan out fresh clips for the scenes the editor changed.
  const regenerated: number[] = [];
  for (const r of regenerate) {
    const { data: clip } = await db
      .from("generated_videos")
      .insert({
        workspace_id: project.workspace_id,
        project_id: project.id,
        scene_index: r.index,
        prompt: r.prompt,
        provider: workspace.model_preferences?.video_generation ?? "seedance",
        status: "pending",
      })
      .select("id")
      .single();
    if (clip) {
      await enqueueJob(db, {
        workspace_id: project.workspace_id,
        stage: "video_generation",
        payload: {
          project_id: project.id,
          generated_video_id: (clip as { id: string }).id,
          duration_s: doc.scenes[r.index]?.duration ?? 5,
        },
        project_id: project.id,
        priority: 6,
      });
      regenerated.push(r.index);
    }
  }

  return { timeline: nextDoc, summary: plan.summary ?? "Edit applied", regenerated };
};
