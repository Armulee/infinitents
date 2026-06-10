import { NextResponse, type NextRequest } from "next/server";
import { processJobs } from "@/server/pipeline/runner";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Worker tick — claims and executes queued ai_jobs.
 * Drivers: the Cloudflare cron worker (workers/cron, CRON_SECRET bearer),
 * the standalone `npm run worker`, or the in-app pulse (any authenticated
 * member).
 */
async function authorized(req: NextRequest): Promise<"cron" | "user" | null> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return "cron";

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? "user" : null;
}

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const who = await authorized(req);
  if (!who) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const summary = await processJobs(8);
    // Users only see counts; full per-job detail is for the cron operator.
    return NextResponse.json(
      who === "cron" ? summary : { claimed: summary.claimed, succeeded: summary.succeeded, failed: summary.failed, requeued: summary.requeued },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "worker error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
