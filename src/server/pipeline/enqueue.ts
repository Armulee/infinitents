
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineStage } from "@/lib/types";

export interface EnqueueInput {
  workspace_id: string;
  stage: PipelineStage;
  payload?: Record<string, unknown>;
  priority?: number;
  delaySeconds?: number;
  brand_id?: string | null;
  idea_id?: string | null;
  script_id?: string | null;
  project_id?: string | null;
  max_attempts?: number;
}

/** Insert a job into the queue (works with both user-session and admin clients). */
export async function enqueueJob(db: SupabaseClient, input: EnqueueInput): Promise<string> {
  const { data, error } = await db
    .from("ai_jobs")
    .insert({
      workspace_id: input.workspace_id,
      stage: input.stage,
      payload: input.payload ?? {},
      priority: input.priority ?? 0,
      scheduled_at: new Date(Date.now() + (input.delaySeconds ?? 0) * 1000).toISOString(),
      brand_id: input.brand_id ?? null,
      idea_id: input.idea_id ?? null,
      script_id: input.script_id ?? null,
      project_id: input.project_id ?? null,
      max_attempts: input.max_attempts ?? 3,
    })
    .select("id")
    .single();

  if (error) throw new Error(`enqueue ${input.stage} failed: ${error.message}`);
  return (data as { id: string }).id;
}

/** Promote an idea into production: create the project and kick script generation. */
export async function startProduction(
  db: SupabaseClient,
  input: { workspace_id: string; brand_id: string; idea_id: string; title: string },
): Promise<string> {
  const { data: project, error } = await db
    .from("video_projects")
    .insert({
      workspace_id: input.workspace_id,
      brand_id: input.brand_id,
      idea_id: input.idea_id,
      title: input.title,
      status: "queued",
    })
    .select("id")
    .single();
  if (error) throw new Error(`create project failed: ${error.message}`);
  const projectId = (project as { id: string }).id;

  await db
    .from("generated_ideas")
    .update({ status: "in_production" })
    .eq("id", input.idea_id);

  await enqueueJob(db, {
    workspace_id: input.workspace_id,
    stage: "script_generation",
    payload: { idea_id: input.idea_id, project_id: projectId },
    brand_id: input.brand_id,
    idea_id: input.idea_id,
    project_id: projectId,
    priority: 5,
  });

  return projectId;
}
