
import type { BrandKnowledge, Script, Storyboard, VideoProject } from "@/lib/types";
import { getImageProvider, getTextProvider } from "@/server/providers/registry";
import {
  imageReferencePrompts,
  promptPackingPrompt,
  storyboardPrompt,
  type PromptPackResult,
  type StoryboardResult,
} from "../prompts";
import { enqueueJob } from "../enqueue";
import { payloadStr, type StageHandler } from "../context";

/**
 * storyboard — scene breakdown, camera direction, composition, transitions.
 */
export const storyboard: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const scriptId = payloadStr(job, "script_id");
  const projectId = payloadStr(job, "project_id");

  await setProgress(15, "Loading approved script");
  const { data: script } = await db.from("scripts").select("*").eq("id", scriptId).single();
  if (!script) throw new Error(`script ${scriptId} not found`);
  const s = script as Script;

  await setProgress(45, "Directing scenes");
  const provider = getTextProvider("storyboard", workspace.model_preferences);
  const { system, prompt } = storyboardPrompt({ script: { title: s.title, scenes: s.scenes } });
  const out = await provider.generateJSON<StoryboardResult>(prompt, {
    system,
    temperature: 0.6,
    maxTokens: 6144,
  });

  await setProgress(80, "Saving storyboard");
  const { data: board, error } = await db
    .from("storyboards")
    .insert({ workspace_id: job.workspace_id, script_id: scriptId, scenes: out.scenes })
    .select("id")
    .single();
  if (error) throw new Error(`insert storyboard: ${error.message}`);
  const storyboardId = (board as { id: string }).id;

  await db
    .from("video_projects")
    .update({ storyboard_id: storyboardId, status: "generating_assets" })
    .eq("id", projectId);

  await enqueueJob(db, {
    workspace_id: job.workspace_id,
    stage: "image_generation",
    payload: { storyboard_id: storyboardId, project_id: projectId, script_id: scriptId },
    script_id: scriptId,
    project_id: projectId,
    priority: 5,
  });

  return { result: { storyboard_id: storyboardId, scenes: out.scenes.length } };
};

/**
 * image_generation — character / environment / mood references via the image
 * provider (GPT Image by default). Chains into prompt_packing.
 */
export const imageGeneration: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const storyboardId = payloadStr(job, "storyboard_id");
  const projectId = payloadStr(job, "project_id");

  await setProgress(10, "Planning reference set");
  const [{ data: board }, { data: project }] = await Promise.all([
    db.from("storyboards").select("*").eq("id", storyboardId).single(),
    db.from("video_projects").select("*, brands(name)").eq("id", projectId).single(),
  ]);
  if (!board || !project) throw new Error("storyboard/project not found");
  const sb = board as Storyboard;
  const proj = project as VideoProject & { brands: { name: string } | null };

  const { data: knowledge } = await db
    .from("brand_knowledge")
    .select("positioning")
    .eq("brand_id", proj.brand_id)
    .maybeSingle();

  const provider = getImageProvider("image_generation", workspace.model_preferences);
  const specs = imageReferencePrompts({
    storyboardScenes: sb.scenes,
    brandName: proj.brands?.name ?? "the brand",
    positioning: (knowledge as Pick<BrandKnowledge, "positioning"> | null)?.positioning,
  });

  let done = 0;
  for (const spec of specs) {
    await setProgress(15 + Math.round((done / specs.length) * 70), `Generating ${spec.kind} reference`);
    const { data: ref } = await db
      .from("image_references")
      .insert({
        workspace_id: job.workspace_id,
        storyboard_id: storyboardId,
        scene_index: spec.scene_index,
        kind: spec.kind,
        prompt: spec.prompt,
        provider: provider.id,
        status: "generating",
      })
      .select("id")
      .single();
    const refId = (ref as { id: string } | null)?.id;
    try {
      const img = await provider.generateImage(spec.prompt, { aspectRatio: "9:16" });
      if (refId) {
        await db.from("image_references").update({ url: img.url, status: "ready" }).eq("id", refId);
      }
    } catch (err) {
      if (refId) {
        await db.from("image_references").update({ status: "failed" }).eq("id", refId);
      }
      console.error(`[image_generation] ${spec.kind} failed:`, err);
    }
    done++;
  }

  await enqueueJob(db, {
    workspace_id: job.workspace_id,
    stage: "prompt_packing",
    payload: { project_id: projectId },
    project_id: projectId,
    priority: 5,
  });

  return { result: { references: specs.length, provider: provider.id } };
};

/**
 * prompt_packing — analyze storyboard → scene count, parallel jobs, optimized
 * per-scene prompts. Creates pending clips and fans out video_generation jobs.
 */
export const promptPacking: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const projectId = payloadStr(job, "project_id");

  await setProgress(10, "Analyzing storyboard");
  const { data: project } = await db
    .from("video_projects")
    .select("*, brands(name)")
    .eq("id", projectId)
    .single();
  if (!project) throw new Error(`project ${projectId} not found`);
  const proj = project as VideoProject & { brands: { name: string } | null };
  if (!proj.storyboard_id || !proj.script_id) throw new Error("project missing storyboard/script");

  const [{ data: board }, { data: script }] = await Promise.all([
    db.from("storyboards").select("*").eq("id", proj.storyboard_id).single(),
    db.from("scripts").select("*").eq("id", proj.script_id).single(),
  ]);
  const sb = board as Storyboard;
  const s = script as Script;

  await setProgress(40, "Packing prompts");
  const provider = getTextProvider("prompt_packing", workspace.model_preferences);
  const { system, prompt } = promptPackingPrompt({
    storyboardScenes: sb.scenes,
    scriptScenes: s.scenes,
    brandName: proj.brands?.name ?? "the brand",
  });
  const pack = await provider.generateJSON<PromptPackResult>(prompt, {
    system,
    temperature: 0.4,
    maxTokens: 6144,
  });

  await setProgress(70, "Queueing parallel generation");
  // Reset any clips from a previous run (regenerate flow).
  await db.from("generated_videos").delete().eq("project_id", projectId);

  await db
    .from("video_projects")
    .update({ prompt_pack: pack, status: "generating_video" })
    .eq("id", projectId);

  const videoProvider = workspace.model_preferences?.video_generation ?? "seedance";
  const prompts = pack.prompts ?? [];
  for (const p of prompts) {
    const { data: clip, error } = await db
      .from("generated_videos")
      .insert({
        workspace_id: job.workspace_id,
        project_id: projectId,
        scene_index: p.scene_index,
        prompt: p.prompt,
        provider: videoProvider,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(`insert clip: ${error.message}`);
    // Fan out — one job per scene runs in parallel (per ai-pipeline.md).
    await enqueueJob(db, {
      workspace_id: job.workspace_id,
      stage: "video_generation",
      payload: {
        project_id: projectId,
        generated_video_id: (clip as { id: string }).id,
        duration_s: p.duration_s,
      },
      project_id: projectId,
      priority: 6,
      max_attempts: 4,
    });
  }

  return { result: { scene_count: pack.scene_count, parallel_jobs: prompts.length } };
};
