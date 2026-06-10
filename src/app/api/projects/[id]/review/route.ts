import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { enqueueJob } from "@/server/pipeline/enqueue";
import type { PlatformConnection, VideoProject, Workspace } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["approve", "reject", "request_changes", "regenerate"]),
  note: z.string().max(2000).optional(),
});

/**
 * Content Queue review actions. RLS scopes everything to the caller's
 * workspace — the session client is used throughout.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { action, note } = parsed.data;

  const { data: projRow, error } = await supabase
    .from("video_projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !projRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const project = projRow as VideoProject;

  switch (action) {
    case "approve": {
      await supabase
        .from("video_projects")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          review_note: null,
        })
        .eq("id", id);

      // Auto-schedule across connected platforms when the workspace allows it.
      const { data: wsRow } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", project.workspace_id)
        .single();
      const ws = wsRow as Workspace | null;
      const autoSchedule = ws?.settings?.auto_schedule !== false;
      if (autoSchedule) {
        const { data: connections } = await supabase
          .from("platform_connections")
          .select("*")
          .eq("workspace_id", project.workspace_id)
          .eq("status", "connected");
        const conns = (connections ?? []) as PlatformConnection[];
        let offset = 0;
        for (const conn of conns) {
          await supabase.from("publishing_jobs").insert({
            workspace_id: project.workspace_id,
            project_id: id,
            connection_id: conn.id,
            platform: conn.platform,
            caption: project.title,
            hashtags: [],
            scheduled_at: new Date(Date.now() + (30 + offset) * 60_000).toISOString(),
            status: "scheduled",
          });
          offset += 15; // stagger platforms
        }
        if (conns.length > 0) {
          await supabase.from("video_projects").update({ status: "scheduled" }).eq("id", id);
        }
      }
      return NextResponse.json({ ok: true, status: autoSchedule ? "scheduled" : "approved" });
    }

    case "reject": {
      await supabase
        .from("video_projects")
        .update({ status: "archived", review_note: note ?? "Rejected in review" })
        .eq("id", id);
      if (project.idea_id) {
        await supabase.from("generated_ideas").update({ status: "rejected" }).eq("id", project.idea_id);
      }
      return NextResponse.json({ ok: true, status: "archived" });
    }

    case "request_changes": {
      await supabase
        .from("video_projects")
        .update({ status: "changes_requested", review_note: note ?? "Requested changes" })
        .eq("id", id);
      await enqueueJob(supabase, {
        workspace_id: project.workspace_id,
        stage: "editing",
        payload: { project_id: id, mode: "revise", instruction: note ?? "Improve the weakest parts of this edit." },
        project_id: id,
        priority: 7,
      });
      return NextResponse.json({ ok: true, status: "changes_requested" });
    }

    case "regenerate": {
      // Full visual regeneration: re-pack prompts and re-generate every scene.
      await supabase
        .from("video_projects")
        .update({ status: "generating_video", review_note: note ?? null })
        .eq("id", id);
      await enqueueJob(supabase, {
        workspace_id: project.workspace_id,
        stage: "prompt_packing",
        payload: { project_id: id },
        project_id: id,
        priority: 6,
      });
      return NextResponse.json({ ok: true, status: "generating_video" });
    }
  }
}
