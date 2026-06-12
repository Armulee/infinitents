import { NextResponse, type NextRequest } from "next/server";
import { runDailySchedule } from "@/server/pipeline/scheduler";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Daily autopilot scheduler — Cloudflare cron worker only (CRON_SECRET bearer). */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!(secret && header === `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runDailySchedule();
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "scheduler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
