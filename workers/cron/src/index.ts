/**
 * Infinitents cron worker — Cloudflare Workers Cron Triggers.
 *
 * Replaces Vercel Cron Jobs (which the Hobby plan can't run on these
 * schedules). The worker is a thin, reliable trigger: all business logic
 * stays in the Next.js API routes it calls.
 *
 * Schedules (UTC, configured in wrangler.toml):
 *   "* * * * *"  → POST {APP_URL}/api/jobs/process    (drain the ai_jobs queue)
 *   "0 6 * * *"  → POST {APP_URL}/api/jobs/schedule   (daily autopilot)
 *
 * Free-plan fit: ~1,441 invocations/day (limit 100,000/day), ≤3 subrequests
 * per invocation (limit 50), and the handler is I/O-bound so the 10 ms CPU
 * budget is untouched while awaiting fetch.
 */

export interface Env {
  /** Base URL of the deployed Next.js app, no trailing slash. Set in wrangler.toml [vars]. */
  APP_URL: string;
  /** Shared secret expected by /api/jobs/*. Set with `wrangler secret put CRON_SECRET`. */
  CRON_SECRET: string;
}

type Task = "process" | "schedule";

const TASK_BY_CRON: Record<string, Task> = {
  "* * * * *": "process",
  "0 6 * * *": "schedule",
};

const TASK_CONFIG: Record<Task, { path: string; timeoutMs: number; retries: number }> = {
  // The queue tick re-runs every minute, so fail fast and let the next tick recover.
  process: { path: "/api/jobs/process", timeoutMs: 55_000, retries: 1 },
  // The daily schedule runs once — be more patient and persistent.
  schedule: { path: "/api/jobs/schedule", timeoutMs: 120_000, retries: 3 },
};

interface TaskResult {
  task: Task;
  ok: boolean;
  status: number | null;
  attempts: number;
  body: string;
  durationMs: number;
}

async function runTask(env: Env, task: Task): Promise<TaskResult> {
  const { path, timeoutMs, retries } = TASK_CONFIG[task];
  const url = `${env.APP_URL.replace(/\/+$/, "")}${path}`;
  const started = Date.now();

  let lastStatus: number | null = null;
  let lastBody = "";

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.CRON_SECRET}`,
          "user-agent": "infinitents-cron-worker/1.0 (+cloudflare)",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      lastStatus = res.status;
      lastBody = (await res.text()).slice(0, 2_000);

      if (res.ok) {
        return {
          task,
          ok: true,
          status: res.status,
          attempts: attempt,
          body: lastBody,
          durationMs: Date.now() - started,
        };
      }
      // 4xx is a configuration problem (bad secret, missing env) — retrying
      // won't fix it; surface it immediately.
      if (res.status >= 400 && res.status < 500) break;
    } catch (err) {
      lastBody = err instanceof Error ? err.message : String(err);
      lastStatus = null;
    }

    if (attempt <= retries) {
      await new Promise((r) => setTimeout(r, 1_000 * 2 ** (attempt - 1)));
    }
  }

  return {
    task,
    ok: false,
    status: lastStatus,
    attempts: retries + 1,
    body: lastBody,
    durationMs: Date.now() - started,
  };
}

function log(result: TaskResult) {
  const line = `[cron:${result.task}] ${result.ok ? "ok" : "FAILED"} status=${result.status ?? "network-error"} attempts=${result.attempts} ${result.durationMs}ms ${result.body.slice(0, 300)}`;
  if (result.ok) console.log(line);
  else console.error(line);
}

function requireEnv(env: Env): string | null {
  if (!env.APP_URL) return "APP_URL is not configured (wrangler.toml [vars])";
  if (!env.CRON_SECRET) return "CRON_SECRET is not configured (wrangler secret put CRON_SECRET)";
  return null;
}

export default {
  /** Cron Trigger entrypoint — controller.cron tells us which schedule fired. */
  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const missing = requireEnv(env);
    if (missing) {
      console.error(`[cron] ${missing}`);
      return;
    }

    const task = TASK_BY_CRON[controller.cron];
    if (!task) {
      console.error(`[cron] no task mapped for cron expression "${controller.cron}"`);
      return;
    }

    const result = await runTask(env, task);
    log(result);
    if (!result.ok) {
      // Throwing marks the invocation as failed in Cloudflare's dashboard
      // metrics, which is where you want the alarm to show up.
      throw new Error(`cron task ${task} failed (status=${result.status ?? "network-error"})`);
    }
  },

  /** HTTP entrypoint — health check + authenticated manual trigger for ops. */
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      const missing = requireEnv(env);
      return Response.json({
        service: "infinitents-cron",
        configured: !missing,
        ...(missing ? { error: missing } : {}),
        schedules: TASK_BY_CRON,
      });
    }

    if (url.pathname === "/trigger") {
      if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      const missing = requireEnv(env);
      if (missing) return Response.json({ error: missing }, { status: 500 });

      const taskParam = url.searchParams.get("task");
      if (taskParam !== "process" && taskParam !== "schedule") {
        return Response.json({ error: "task must be 'process' or 'schedule'" }, { status: 400 });
      }
      const result = await runTask(env, taskParam);
      log(result);
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
