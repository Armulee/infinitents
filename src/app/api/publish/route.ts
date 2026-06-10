import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { enqueueJob } from "@/server/pipeline/enqueue";
import type { PlatformConnection, VideoProject } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  project_id: z.string().uuid(),
  connection_ids: z.array(z.string().uuid()).min(1),
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string().max(64)).max(20).optional(),
  /** ISO datetime; omit to publish now */
  scheduled_at: z.string().datetime({ offset: true }).optional(),
});

/** Publishing Center — schedule or immediately publish a project. */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { project_id, connection_ids, caption, hashtags, scheduled_at } = parsed.data;

  const { data: projRow } = await supabase
    .from("video_projects")
    .select("*")
    .eq("id", project_id)
    .single();
  if (!projRow) return NextResponse.json({ error: "project not found" }, { status: 404 });
  const project = projRow as VideoProject;

  const { data: connRows } = await supabase
    .from("platform_connections")
    .select("*")
    .in("id", connection_ids)
    .eq("workspace_id", project.workspace_id);
  const connections = (connRows ?? []) as PlatformConnection[];
  if (connections.length === 0) {
    return NextResponse.json({ error: "no valid connections" }, { status: 400 });
  }

  const publishNow = !scheduled_at || new Date(scheduled_at).getTime() <= Date.now();
  const created: string[] = [];

  for (const conn of connections) {
    const { data: pub, error } = await supabase
      .from("publishing_jobs")
      .insert({
        workspace_id: project.workspace_id,
        project_id,
        connection_id: conn.id,
        platform: conn.platform,
        caption: caption ?? project.title,
        hashtags: hashtags ?? [],
        scheduled_at: scheduled_at ?? new Date().toISOString(),
        status: publishNow ? "publishing" : "scheduled",
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const pubId = (pub as { id: string }).id;
    created.push(pubId);

    if (publishNow) {
      await enqueueJob(supabase, {
        workspace_id: project.workspace_id,
        stage: "publishing",
        payload: { publishing_job_id: pubId },
        project_id,
        priority: 8,
      });
    }
  }

  await supabase
    .from("video_projects")
    .update({ status: publishNow ? "publishing" : "scheduled" })
    .eq("id", project_id);

  return NextResponse.json({ ok: true, publishing_job_ids: created, immediate: publishNow });
}
