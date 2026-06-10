
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Brand, GeneratedIdea, PublishingJob, Workspace } from "@/lib/types";
import { enqueueJob, startProduction } from "./enqueue";

export interface ScheduleSummary {
  workspaces: number;
  ideaJobs: number;
  productionsStarted: number;
  publishJobsKicked: number;
  analyticsJobs: number;
}

/**
 * Daily autopilot — the core product promise: "Give me X videos per day."
 *
 * For every autopilot workspace:
 *  1. Generate 2 × daily_video_target fresh ideas (per ai-pipeline.md)
 *  2. Promote the top-scoring ideas into production up to the daily target
 *  3. Kick due scheduled publishes
 *  4. Sync analytics (feeds the learning loop)
 */
export async function runDailySchedule(): Promise<ScheduleSummary> {
  const db = supabaseAdmin();
  const summary: ScheduleSummary = {
    workspaces: 0,
    ideaJobs: 0,
    productionsStarted: 0,
    publishJobsKicked: 0,
    analyticsJobs: 0,
  };

  const { data: wsRows, error } = await db.from("workspaces").select("*");
  if (error) throw new Error(`load workspaces: ${error.message}`);
  const workspaces = (wsRows ?? []) as Workspace[];

  for (const ws of workspaces) {
    summary.workspaces++;

    // 3. Due publishes run for everyone, autopilot or not.
    const { data: due } = await db
      .from("publishing_jobs")
      .select("id, workspace_id, project_id")
      .eq("workspace_id", ws.id)
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());
    for (const pub of (due ?? []) as Pick<PublishingJob, "id" | "workspace_id" | "project_id">[]) {
      await db.from("publishing_jobs").update({ status: "publishing" }).eq("id", pub.id);
      await enqueueJob(db, {
        workspace_id: ws.id,
        stage: "publishing",
        payload: { publishing_job_id: pub.id },
        project_id: pub.project_id,
        priority: 8,
      });
      summary.publishJobsKicked++;
    }

    // 4. Analytics sync + learning loop.
    const { data: hasPublished } = await db
      .from("publishing_jobs")
      .select("id")
      .eq("workspace_id", ws.id)
      .eq("status", "published")
      .limit(1);
    if ((hasPublished ?? []).length > 0) {
      await enqueueJob(db, { workspace_id: ws.id, stage: "analytics_sync", priority: 2 });
      summary.analyticsJobs++;
    }

    if (!ws.autopilot) continue;

    const { data: brandRows } = await db
      .from("brands")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("created_at")
      .limit(1);
    const brand = ((brandRows ?? []) as Brand[])[0];
    if (!brand) continue;

    // 1. Idea generation: 2 × daily target (skip if today's batch exists).
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: todayJobs } = await db
      .from("ai_jobs")
      .select("id")
      .eq("workspace_id", ws.id)
      .eq("stage", "idea_generation")
      .gte("created_at", startOfDay.toISOString())
      .limit(1);
    if ((todayJobs ?? []).length === 0) {
      await enqueueJob(db, {
        workspace_id: ws.id,
        stage: "idea_generation",
        payload: { brand_id: brand.id, count: ws.daily_video_target * 2 },
        brand_id: brand.id,
        priority: 3,
      });
      summary.ideaJobs++;
    }

    // 2. Fill today's production slots with the best available ideas.
    const { data: startedToday } = await db
      .from("video_projects")
      .select("id")
      .eq("workspace_id", ws.id)
      .gte("created_at", startOfDay.toISOString());
    const slotsLeft = ws.daily_video_target - (startedToday ?? []).length;
    if (slotsLeft > 0) {
      const { data: candidates } = await db
        .from("generated_ideas")
        .select("*")
        .eq("workspace_id", ws.id)
        .in("status", ["new", "shortlisted"])
        .order("predicted_score", { ascending: false })
        .limit(slotsLeft);
      for (const idea of (candidates ?? []) as GeneratedIdea[]) {
        await startProduction(db, {
          workspace_id: ws.id,
          brand_id: idea.brand_id,
          idea_id: idea.id,
          title: idea.title,
        });
        summary.productionsStarted++;
      }
    }
  }

  return summary;
}
