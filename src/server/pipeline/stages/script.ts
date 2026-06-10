
import type { BrandKnowledge, GeneratedIdea, Script } from "@/lib/types";
import { getTextProvider } from "@/server/providers/registry";
import { auditPrompt, scriptGenerationPrompt, type AuditResult, type ScriptResult } from "../prompts";
import { enqueueJob } from "../enqueue";
import { payloadStr, setProjectStatus, type StageHandler } from "../context";

const MAX_REVISIONS = 2;

/**
 * script_generation — idea → voiceover, scene breakdown, visual direction,
 * b-roll, CTA. Chains into audit.
 */
export const scriptGeneration: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const ideaId = payloadStr(job, "idea_id");
  const projectId = payloadStr(job, "project_id");
  const revisionNotes = typeof job.payload.revision_notes === "string" ? job.payload.revision_notes : undefined;
  const revision = typeof job.payload.revision === "number" ? job.payload.revision : 0;

  await setProjectStatus(db, projectId, "scripting");
  await setProgress(10, "Loading idea + Brand Brain");

  const { data: idea } = await db.from("generated_ideas").select("*").eq("id", ideaId).single();
  if (!idea) throw new Error(`idea ${ideaId} not found`);
  const i = idea as GeneratedIdea;

  const [{ data: knowledge }, { data: brand }] = await Promise.all([
    db.from("brand_knowledge").select("*").eq("brand_id", i.brand_id).maybeSingle(),
    db.from("brands").select("name").eq("id", i.brand_id).single(),
  ]);

  await setProgress(40, revision > 0 ? `Revising script (round ${revision})` : "Writing script");
  const provider = getTextProvider("script_generation", workspace.model_preferences);
  const { system, prompt } = scriptGenerationPrompt({
    idea: i,
    knowledge: (knowledge as BrandKnowledge | null) ?? null,
    brandName: (brand as { name: string } | null)?.name ?? "the brand",
    revisionNotes,
  });
  const out = await provider.generateJSON<ScriptResult>(prompt, {
    system,
    temperature: 0.8,
    maxTokens: 8192,
  });

  await setProgress(80, "Saving script");
  const { data: script, error } = await db
    .from("scripts")
    .insert({
      workspace_id: job.workspace_id,
      brand_id: i.brand_id,
      idea_id: ideaId,
      title: out.title,
      hook: out.hook,
      voiceover: out.voiceover,
      scenes: out.scenes,
      cta: out.cta,
      duration_seconds: out.duration_seconds,
      status: "auditing",
      version: revision + 1,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert script: ${error.message}`);
  const scriptId = (script as { id: string }).id;

  await db.from("video_projects").update({ script_id: scriptId, status: "auditing" }).eq("id", projectId);

  await enqueueJob(db, {
    workspace_id: job.workspace_id,
    stage: "audit",
    payload: { script_id: scriptId, project_id: projectId, idea_id: ideaId, revision },
    brand_id: i.brand_id,
    script_id: scriptId,
    project_id: projectId,
    priority: 5,
  });

  return { result: { script_id: scriptId, provider: provider.id, scenes: out.scenes.length } };
};

/**
 * audit — platform safety, virality, copyright, clarity, brand alignment.
 * Only approved scripts continue (per ai-pipeline.md). needs_revision loops
 * back into script_generation up to MAX_REVISIONS times.
 */
export const audit: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const scriptId = payloadStr(job, "script_id");
  const projectId = payloadStr(job, "project_id");
  const revision = typeof job.payload.revision === "number" ? job.payload.revision : 0;

  await setProgress(15, "Loading script");
  const { data: script } = await db.from("scripts").select("*").eq("id", scriptId).single();
  if (!script) throw new Error(`script ${scriptId} not found`);
  const s = script as Script;

  const { data: knowledge } = await db
    .from("brand_knowledge")
    .select("*")
    .eq("brand_id", s.brand_id)
    .maybeSingle();

  await setProgress(45, "Auditing script");
  const provider = getTextProvider("audit", workspace.model_preferences);
  const { system, prompt } = auditPrompt({
    script: { title: s.title, voiceover: s.voiceover, scenes: s.scenes, cta: s.cta },
    knowledge: (knowledge as BrandKnowledge | null) ?? null,
  });
  const out = await provider.generateJSON<AuditResult>(prompt, {
    system,
    temperature: 0.2,
    maxTokens: 4096,
  });

  await setProgress(80, "Recording verdict");
  await db.from("audit_reports").insert({
    workspace_id: job.workspace_id,
    script_id: scriptId,
    viral_score: out.viral_score,
    risk_score: out.risk_score,
    verdict: out.verdict,
    platform_safety: out.platform_safety,
    copyright_risk: out.copyright_risk,
    clarity: out.clarity,
    brand_alignment: out.brand_alignment,
    report: out.report,
  });

  if (out.verdict === "approved") {
    await db.from("scripts").update({ status: "approved" }).eq("id", scriptId);
    await setProjectStatus(db, projectId, "storyboarding");
    await enqueueJob(db, {
      workspace_id: job.workspace_id,
      stage: "storyboard",
      payload: { script_id: scriptId, project_id: projectId },
      script_id: scriptId,
      project_id: projectId,
      priority: 5,
    });
  } else if (out.verdict === "needs_revision" && revision < MAX_REVISIONS) {
    await db.from("scripts").update({ status: "revising" }).eq("id", scriptId);
    await enqueueJob(db, {
      workspace_id: job.workspace_id,
      stage: "script_generation",
      payload: {
        idea_id: s.idea_id,
        project_id: projectId,
        revision: revision + 1,
        revision_notes: (out.report.fixes ?? []).join("\n") || out.report.summary,
      },
      brand_id: s.brand_id,
      idea_id: s.idea_id,
      project_id: projectId,
      priority: 5,
    });
  } else {
    // rejected, or out of revision budget — stop the line.
    await db.from("scripts").update({ status: "rejected" }).eq("id", scriptId);
    await setProjectStatus(db, projectId, "failed", {
      review_note: `Audit ${out.verdict}: ${out.report.summary ?? "did not meet the bar"}`,
    });
    if (s.idea_id) {
      await db.from("generated_ideas").update({ status: "rejected" }).eq("id", s.idea_id);
    }
  }

  return {
    result: { verdict: out.verdict, viral_score: out.viral_score, risk_score: out.risk_score },
  };
};
