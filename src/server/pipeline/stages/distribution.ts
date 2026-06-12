
import type {
  AnalyticsRow,
  BrandKnowledge,
  GeneratedIdea,
  Learning,
  PlatformConnection,
  PublishingJob,
  VideoProject,
} from "@/lib/types";
import { fetchPlatformMetrics, publishToPlatform } from "@/server/platforms";
import { getTextProvider } from "@/server/providers/registry";
import { learningLoopPrompt, type LearningResult } from "../prompts";
import { payloadStr, type StageHandler } from "../context";

/**
 * publishing — push an approved video to the connected platform.
 */
export const publishing: StageHandler = async ({ db, job, setProgress }) => {
  const publishingJobId = payloadStr(job, "publishing_job_id");

  const { data: pubRow } = await db
    .from("publishing_jobs")
    .select("*")
    .eq("id", publishingJobId)
    .single();
  if (!pubRow) throw new Error(`publishing job ${publishingJobId} not found`);
  const pub = pubRow as PublishingJob;
  if (pub.status === "published") return { result: { skipped: "already published" } };

  await db.from("publishing_jobs").update({ status: "publishing" }).eq("id", publishingJobId);
  await setProgress(20, "Preparing upload");

  const [{ data: project }, { data: connection }] = await Promise.all([
    db.from("video_projects").select("*").eq("id", pub.project_id).single(),
    pub.connection_id
      ? db.from("platform_connections").select("*").eq("id", pub.connection_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const proj = project as VideoProject | null;

  await db.from("video_projects").update({ status: "publishing" }).eq("id", pub.project_id);
  await setProgress(55, `Publishing to ${pub.platform}`);

  try {
    const out = await publishToPlatform({
      connection: (connection as PlatformConnection | null) ?? null,
      platform: pub.platform,
      videoUrl: proj?.final_video_url ?? null,
      caption: pub.caption ?? proj?.title ?? "",
      hashtags: pub.hashtags ?? [],
    });

    const publishedAt = new Date().toISOString();
    await db
      .from("publishing_jobs")
      .update({
        status: "published",
        published_at: publishedAt,
        external_id: out.externalId,
        external_url: out.externalUrl,
        error: null,
      })
      .eq("id", publishingJobId);
    await db
      .from("video_projects")
      .update({ status: "published" })
      .eq("id", pub.project_id);

    return { result: { external_url: out.externalUrl, simulated: out.simulated } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("publishing_jobs")
      .update({ status: "failed", error: message })
      .eq("id", publishingJobId);
    await db
      .from("video_projects")
      .update({ status: "failed", review_note: `Publishing failed: ${message}` })
      .eq("id", pub.project_id);
    throw err;
  }
};

/**
 * analytics_sync — collect metrics for every published post in the workspace,
 * then run the learning loop: feed results back into Brand Brain so the idea
 * and script engines improve continuously.
 */
export const analyticsSync: StageHandler = async ({ db, job, workspace, setProgress }) => {
  await setProgress(10, "Collecting platform metrics");

  const { data: published } = await db
    .from("publishing_jobs")
    .select("*")
    .eq("workspace_id", job.workspace_id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  const jobs = (published ?? []) as PublishingJob[];
  if (jobs.length === 0) return { result: { synced: 0 } };

  const connectionIds = [...new Set(jobs.map((j) => j.connection_id).filter(Boolean))] as string[];
  const { data: connections } = connectionIds.length
    ? await db.from("platform_connections").select("*").in("id", connectionIds)
    : { data: [] };
  const connById = new Map(
    ((connections ?? []) as PlatformConnection[]).map((c) => [c.id, c]),
  );

  const projectIds = [...new Set(jobs.map((j) => j.project_id))];
  const { data: projects } = await db
    .from("video_projects")
    .select("id, title, brand_id, duration_seconds, idea_id")
    .in("id", projectIds);
  const projById = new Map(
    ((projects ?? []) as Pick<VideoProject, "id" | "title" | "brand_id" | "duration_seconds" | "idea_id">[]).map(
      (p) => [p.id, p],
    ),
  );

  let synced = 0;
  const rows: Omit<AnalyticsRow, "id" | "raw">[] = [];
  for (const pub of jobs) {
    if (!pub.external_id || !pub.published_at) continue;
    const proj = projById.get(pub.project_id);
    const metrics = await fetchPlatformMetrics({
      connection: pub.connection_id ? (connById.get(pub.connection_id) ?? null) : null,
      platform: pub.platform,
      externalId: pub.external_id,
      publishedAt: pub.published_at,
      durationSeconds: proj?.duration_seconds ?? 30,
    });
    rows.push({
      workspace_id: job.workspace_id,
      project_id: pub.project_id,
      publishing_job_id: pub.id,
      platform: pub.platform,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      watch_time_seconds: metrics.watch_time_seconds,
      avg_watch_pct: metrics.avg_watch_pct,
      followers_delta: metrics.followers_delta,
      revenue_cents: metrics.revenue_cents,
      collected_at: new Date().toISOString(),
    });
    synced++;
  }
  if (rows.length > 0) {
    const { error } = await db.from("analytics").insert(rows);
    if (error) throw new Error(`insert analytics: ${error.message}`);
  }

  // ── Learning loop ──────────────────────────────────────────────────────────
  await setProgress(70, "Running learning loop");
  const brandIds = [...new Set([...projById.values()].map((p) => p.brand_id))];
  for (const brandId of brandIds) {
    const brandJobs = jobs.filter((j) => projById.get(j.project_id)?.brand_id === brandId).slice(0, 12);
    if (brandJobs.length === 0) continue;

    const ideaIds = brandJobs
      .map((j) => projById.get(j.project_id)?.idea_id)
      .filter(Boolean) as string[];
    const { data: ideas } = ideaIds.length
      ? await db.from("generated_ideas").select("id, content_pillar, emotional_trigger").in("id", ideaIds)
      : { data: [] };
    const ideaById = new Map(
      ((ideas ?? []) as Pick<GeneratedIdea, "id" | "content_pillar" | "emotional_trigger">[]).map((i) => [
        i.id,
        i,
      ]),
    );

    const performance = brandJobs.map((j) => {
      const proj = projById.get(j.project_id);
      const row = rows.find((r) => r.publishing_job_id === j.id);
      const idea = proj?.idea_id ? ideaById.get(proj.idea_id) : undefined;
      return {
        title: proj?.title ?? "Untitled",
        platform: j.platform,
        views: row?.views ?? 0,
        avg_watch_pct: row?.avg_watch_pct ?? 0,
        shares: row?.shares ?? 0,
        likes: row?.likes ?? 0,
        pillar: idea?.content_pillar,
        trigger: idea?.emotional_trigger,
      };
    });

    const { data: brand } = await db.from("brands").select("name").eq("id", brandId).single();
    const provider = getTextProvider("idea_generation", workspace.model_preferences);
    const { system, prompt } = learningLoopPrompt({
      brandName: (brand as { name: string } | null)?.name ?? "the brand",
      performance,
    });

    try {
      const out = await provider.generateJSON<LearningResult>(prompt, {
        system,
        temperature: 0.3,
        maxTokens: 2048,
      });
      const { data: knowledge } = await db
        .from("brand_knowledge")
        .select("id, learnings")
        .eq("brand_id", brandId)
        .maybeSingle();
      if (knowledge) {
        const k = knowledge as Pick<BrandKnowledge, "id" | "learnings">;
        const now = new Date().toISOString();
        const merged: Learning[] = [
          ...out.learnings.map((l) => ({ ...l, at: now })),
          ...(k.learnings ?? []),
        ].slice(0, 12);
        await db.from("brand_knowledge").update({ learnings: merged }).eq("id", k.id);
      }
    } catch (err) {
      console.error("[analytics_sync] learning loop failed (non-fatal)", err);
    }
  }

  return { result: { synced, brands: brandIds.length } };
};
