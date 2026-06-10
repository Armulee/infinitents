
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiJob, PipelineStage, Workspace } from "@/lib/types";

export interface StageContext {
  /** Service-role client — stages run outside a user session. */
  db: SupabaseClient;
  job: AiJob;
  workspace: Workspace;
  /** Surface progress to the UI via Realtime on ai_jobs. */
  setProgress: (pct: number, label?: string) => Promise<void>;
}

export interface StageResult {
  result?: Record<string, unknown>;
  /** Re-queue this same job after a delay (used by async video polling). */
  requeueInSeconds?: number;
}

export type StageHandler = (ctx: StageContext) => Promise<StageResult | void>;

export type StageRegistry = Record<PipelineStage, StageHandler>;

export function payloadStr(job: AiJob, key: string): string {
  const v = job.payload[key];
  if (typeof v !== "string" || !v) throw new Error(`job ${job.id}: missing payload.${key}`);
  return v;
}

export function payloadNum(job: AiJob, key: string, fallback: number): number {
  const v = job.payload[key];
  return typeof v === "number" ? v : fallback;
}

export async function setProjectStatus(
  db: SupabaseClient,
  projectId: string,
  status: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await db
    .from("video_projects")
    .update({ status, ...extra })
    .eq("id", projectId);
  if (error) throw new Error(`update project ${projectId}: ${error.message}`);
}
