import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { applyEditInstruction } from "@/server/pipeline/aiEditor";
import { timelineDuration } from "@/lib/timeline";
import type { VideoProject, Workspace } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ instruction: z.string().min(2).max(2000) });

/** Studio AI chat panel — natural-language edits applied directly to the project. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { data: projRow } = await supabase.from("video_projects").select("*").eq("id", id).single();
  if (!projRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const project = projRow as VideoProject;

  const { data: wsRow } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", project.workspace_id)
    .single();
  if (!wsRow) return NextResponse.json({ error: "workspace not found" }, { status: 404 });

  try {
    const { timeline, summary, regenerated } = await applyEditInstruction({
      db: supabase,
      workspace: wsRow as Workspace,
      project,
      instruction: parsed.data.instruction,
    });
    await supabase
      .from("video_projects")
      .update({ timeline, duration_seconds: Math.round(timelineDuration(timeline)) })
      .eq("id", id);
    return NextResponse.json({ ok: true, summary, regenerated, timeline });
  } catch (err) {
    const message = err instanceof Error ? err.message : "edit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
