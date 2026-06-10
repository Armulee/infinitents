
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AiJob, Workspace } from "@/lib/types";
import type { StageRegistry } from "./context";
import { brandExtraction } from "./stages/brand";
import { ideaGeneration } from "./stages/ideas";
import { audit, scriptGeneration } from "./stages/script";
import { imageGeneration, promptPacking, storyboard } from "./stages/visuals";
import { editing, videoGeneration } from "./stages/video";
import { analyticsSync, publishing } from "./stages/distribution";

const STAGES: StageRegistry = {
  brand_extraction: brandExtraction,
  idea_generation: ideaGeneration,
  script_generation: scriptGeneration,
  audit,
  storyboard,
  image_generation: imageGeneration,
  prompt_packing: promptPacking,
  video_generation: videoGeneration,
  editing,
  publishing,
  analytics_sync: analyticsSync,
};

export interface TickSummary {
  claimed: number;
  succeeded: number;
  failed: number;
  requeued: number;
  details: { id: string; stage: string; outcome: string }[];
}

/**
 * One worker tick: claim a batch of queued jobs (SKIP LOCKED — safe to run
 * many workers concurrently) and execute each stage handler.
 */
export async function processJobs(batchSize = 6): Promise<TickSummary> {
  const db = supabaseAdmin();
  const summary: TickSummary = { claimed: 0, succeeded: 0, failed: 0, requeued: 0, details: [] };

  const { data: claimed, error } = await db.rpc("claim_next_jobs", { batch_size: batchSize });
  if (error) throw new Error(`claim_next_jobs: ${error.message}`);
  const jobs = (claimed ?? []) as AiJob[];
  summary.claimed = jobs.length;
  if (jobs.length === 0) return summary;

  const workspaceIds = [...new Set(jobs.map((j) => j.workspace_id))];
  const { data: workspaces } = await db.from("workspaces").select("*").in("id", workspaceIds);
  const wsById = new Map(((workspaces ?? []) as Workspace[]).map((w) => [w.id, w]));

  // Stages run concurrently — they're independent rows by design.
  await Promise.all(
    jobs.map(async (job) => {
      const workspace = wsById.get(job.workspace_id);
      const handler = STAGES[job.stage];
      const setProgress = async (pct: number, label?: string) => {
        await db
          .from("ai_jobs")
          .update({ progress: pct, ...(label ? { progress_label: label } : {}) })
          .eq("id", job.id);
      };

      try {
        if (!workspace) throw new Error(`workspace ${job.workspace_id} not found`);
        if (!handler) throw new Error(`no handler for stage ${job.stage}`);

        const out = await handler({ db, job, workspace, setProgress });

        if (out?.requeueInSeconds !== undefined) {
          // Async stage (e.g. video polling) — put it back on the queue.
          await db
            .from("ai_jobs")
            .update({
              status: "queued",
              attempts: job.attempts - 1, // requeue is not a failure attempt
              scheduled_at: new Date(Date.now() + out.requeueInSeconds * 1000).toISOString(),
            })
            .eq("id", job.id);
          summary.requeued++;
          summary.details.push({ id: job.id, stage: job.stage, outcome: "requeued" });
          return;
        }

        await db
          .from("ai_jobs")
          .update({
            status: "succeeded",
            result: out?.result ?? {},
            progress: 100,
            finished_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        summary.succeeded++;
        summary.details.push({ id: job.id, stage: job.stage, outcome: "succeeded" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const retryable = job.attempts < job.max_attempts;
        await db
          .from("ai_jobs")
          .update(
            retryable
              ? {
                  status: "queued",
                  error: message,
                  // exponential backoff: 15s, 60s, 240s…
                  scheduled_at: new Date(Date.now() + 15_000 * 4 ** (job.attempts - 1)).toISOString(),
                }
              : {
                  status: "failed",
                  error: message,
                  finished_at: new Date().toISOString(),
                },
          )
          .eq("id", job.id);
        summary.failed++;
        summary.details.push({
          id: job.id,
          stage: job.stage,
          outcome: retryable ? `retry scheduled (${message})` : `failed (${message})`,
        });
        console.error(`[worker] ${job.stage} ${job.id}:`, message);
      }
    }),
  );

  return summary;
}
