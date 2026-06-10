
import type { GeneratedVideo, Script, Storyboard, VideoProject } from "@/lib/types";
import { getVideoProvider } from "@/server/providers/registry";
import { assembleTimeline, timelineDuration } from "@/lib/timeline";
import { applyEditInstruction } from "../aiEditor";
import { enqueueJob } from "../enqueue";
import { payloadNum, payloadStr, setProjectStatus, type StageHandler } from "../context";

const MAX_CLIP_ATTEMPTS = 3;
const POLL_DELAY_S = 8;

/**
 * video_generation — one job per scene, runs as a state machine:
 * start provider job → requeue → poll → retry on failure → mark ready.
 * Supports parallel generation, retries and partial regeneration.
 */
export const videoGeneration: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const projectId = payloadStr(job, "project_id");
  const clipId = payloadStr(job, "generated_video_id");
  const durationS = payloadNum(job, "duration_s", 5);

  const { data: clipRow } = await db.from("generated_videos").select("*").eq("id", clipId).single();
  if (!clipRow) throw new Error(`clip ${clipId} not found`);
  const clip = clipRow as GeneratedVideo;

  const provider = getVideoProvider("video_generation", workspace.model_preferences);

  // Phase 1 — kick off generation.
  if (!clip.provider_job_id) {
    await setProgress(5, `Scene ${clip.scene_index + 1}: starting generation`);

    // Reuse a character reference for cross-scene consistency when available.
    const { data: project } = await db
      .from("video_projects")
      .select("storyboard_id")
      .eq("id", projectId)
      .single();
    let referenceImageUrl: string | undefined;
    const storyboardId = (project as { storyboard_id: string | null } | null)?.storyboard_id;
    if (storyboardId) {
      const { data: ref } = await db
        .from("image_references")
        .select("url")
        .eq("storyboard_id", storyboardId)
        .eq("kind", "character")
        .eq("status", "ready")
        .maybeSingle();
      referenceImageUrl = (ref as { url: string | null } | null)?.url ?? undefined;
    }

    const { providerJobId } = await provider.startClip(clip.prompt, {
      aspectRatio: "9:16",
      durationSeconds: durationS,
      referenceImageUrl,
    });
    await db
      .from("generated_videos")
      .update({ provider_job_id: providerJobId, provider: provider.id, status: "generating" })
      .eq("id", clipId);
    return { requeueInSeconds: POLL_DELAY_S };
  }

  // Phase 2 — poll.
  const state = await provider.pollClip(clip.provider_job_id);

  if (state.state === "running") {
    await setProgress(
      Math.max(10, Math.min(95, state.progress)),
      `Scene ${clip.scene_index + 1}: generating`,
    );
    return { requeueInSeconds: POLL_DELAY_S };
  }

  if (state.state === "failed") {
    if (clip.attempt < MAX_CLIP_ATTEMPTS) {
      // Retry generation (fresh provider job).
      await db
        .from("generated_videos")
        .update({ provider_job_id: null, attempt: clip.attempt + 1, status: "pending", error: state.error })
        .eq("id", clipId);
      return { requeueInSeconds: 4 };
    }
    await db.from("generated_videos").update({ status: "failed", error: state.error }).eq("id", clipId);
    await setProjectStatus(db, projectId, "failed", {
      review_note: `Scene ${clip.scene_index + 1} failed after ${MAX_CLIP_ATTEMPTS} attempts: ${state.error}`,
    });
    throw new Error(`clip ${clipId} failed: ${state.error}`);
  }

  // Succeeded.
  await db
    .from("generated_videos")
    .update({
      status: "ready",
      url: state.url,
      thumbnail_url: state.thumbnailUrl ?? null,
      duration_seconds: state.durationSeconds ?? durationS,
      error: null,
    })
    .eq("id", clipId);
  await setProgress(100, `Scene ${clip.scene_index + 1}: ready`);

  // When the whole set is ready, hand off to editing exactly once.
  const { data: remaining } = await db
    .from("generated_videos")
    .select("id, status")
    .eq("project_id", projectId)
    .neq("status", "ready");
  if ((remaining ?? []).length === 0) {
    const { data: proj } = await db
      .from("video_projects")
      .select("status")
      .eq("id", projectId)
      .single();
    if ((proj as { status: string } | null)?.status === "generating_video") {
      await setProjectStatus(db, projectId, "editing");
      await enqueueJob(db, {
        workspace_id: job.workspace_id,
        stage: "editing",
        payload: { project_id: projectId, mode: "assemble" },
        project_id: projectId,
        priority: 7,
      });
    }
  }

  return { result: { scene_index: clip.scene_index, url: state.url } };
};

/**
 * editing — assemble the editor timeline (scenes, subtitles, audio,
 * transitions) from pipeline artifacts, or apply an AI revision when the
 * reviewer requested changes. Lands the project in the Content Queue.
 */
export const editing: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const projectId = payloadStr(job, "project_id");
  const mode = job.payload.mode === "revise" ? "revise" : "assemble";

  const { data: projRow } = await db.from("video_projects").select("*").eq("id", projectId).single();
  if (!projRow) throw new Error(`project ${projectId} not found`);
  const project = projRow as VideoProject;

  if (mode === "revise") {
    const instruction =
      typeof job.payload.instruction === "string" && job.payload.instruction
        ? job.payload.instruction
        : project.review_note ?? "Improve pacing and tighten the edit.";
    await setProgress(30, "Applying requested changes");
    const { timeline, summary } = await applyEditInstruction({
      db,
      workspace,
      project,
      instruction,
    });
    const duration = Math.round(timelineDuration(timeline));
    await db
      .from("video_projects")
      .update({ timeline, duration_seconds: duration, status: "ready_for_review", review_note: null })
      .eq("id", projectId);
    return { result: { mode, summary } };
  }

  await setProgress(20, "Collecting scenes");
  const [{ data: script }, { data: board }, { data: clips }] = await Promise.all([
    project.script_id
      ? db.from("scripts").select("*").eq("id", project.script_id).single()
      : Promise.resolve({ data: null }),
    project.storyboard_id
      ? db.from("storyboards").select("*").eq("id", project.storyboard_id).single()
      : Promise.resolve({ data: null }),
    db
      .from("generated_videos")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "ready")
      .order("scene_index"),
  ]);
  if (!script) throw new Error("project has no script to edit against");

  await setProgress(55, "Assembling timeline + captions");
  const timeline = assembleTimeline(
    script as Script,
    (board as Storyboard | null) ?? null,
    (clips ?? []) as GeneratedVideo[],
  );
  const duration = Math.round(timelineDuration(timeline));
  const firstThumb = timeline.scenes.find((s) => s.thumbnail_url)?.thumbnail_url ?? null;

  // Optional external render service produces the final MP4. Without it the
  // review player stitches scene clips client-side (see VideoPlayer).
  let finalUrl: string | null = null;
  if (process.env.RENDER_SERVICE_URL) {
    await setProgress(75, "Rendering final video");
    try {
      const res = await fetch(`${process.env.RENDER_SERVICE_URL}/render`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.RENDER_SERVICE_TOKEN
            ? { authorization: `Bearer ${process.env.RENDER_SERVICE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ project_id: projectId, timeline }),
      });
      if (res.ok) {
        const out = (await res.json()) as { url?: string };
        finalUrl = out.url ?? null;
      }
    } catch (err) {
      console.error("[editing] render service unavailable, continuing with scene playback", err);
    }
  }

  await setProgress(90, "Sending to review queue");
  await db
    .from("video_projects")
    .update({
      timeline,
      duration_seconds: duration,
      thumbnail_url: project.thumbnail_url ?? firstThumb,
      final_video_url: finalUrl,
      status: "ready_for_review",
    })
    .eq("id", projectId);

  return { result: { scenes: timeline.scenes.length, duration_seconds: duration } };
};
