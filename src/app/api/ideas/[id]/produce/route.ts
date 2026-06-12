import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { startProduction } from "@/server/pipeline/enqueue";
import type { GeneratedIdea } from "@/lib/types";

export const runtime = "nodejs";

/** Viral Lab → "Produce": promote an idea into the content factory. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: ideaRow } = await supabase.from("generated_ideas").select("*").eq("id", id).single();
  if (!ideaRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const idea = ideaRow as GeneratedIdea;
  if (idea.status === "in_production") {
    return NextResponse.json({ error: "already in production" }, { status: 409 });
  }

  try {
    const projectId = await startProduction(supabase, {
      workspace_id: idea.workspace_id,
      brand_id: idea.brand_id,
      idea_id: idea.id,
      title: idea.title,
    });
    return NextResponse.json({ ok: true, project_id: projectId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to start production";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
