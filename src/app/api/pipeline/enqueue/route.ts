import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { enqueueJob } from "@/server/pipeline/enqueue";
import { PIPELINE_STAGES } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  workspace_id: z.string().uuid(),
  stage: z.enum(PIPELINE_STAGES),
  payload: z.record(z.string(), z.unknown()).optional(),
  brand_id: z.string().uuid().nullish(),
  project_id: z.string().uuid().nullish(),
  priority: z.number().int().min(0).max(10).optional(),
});

/**
 * Generic enqueue for user-initiated stages (brand extraction, idea batches,
 * analytics refresh…). RLS enforces workspace membership on the insert.
 */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const jobId = await enqueueJob(supabase, {
      workspace_id: parsed.data.workspace_id,
      stage: parsed.data.stage,
      payload: parsed.data.payload,
      brand_id: parsed.data.brand_id ?? undefined,
      project_id: parsed.data.project_id ?? undefined,
      priority: parsed.data.priority,
    });
    return NextResponse.json({ ok: true, job_id: jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "enqueue failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
