/* Standalone queue worker — `npm run worker`.
 * Polls the job queue continuously; safe to run alongside cron-driven ticks
 * (claiming uses FOR UPDATE SKIP LOCKED). */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { processJobs } = await import("../src/server/pipeline/runner");
  console.log("[worker] Infinitents pipeline worker started (Ctrl+C to stop)");
  let idleTicks = 0;
  for (;;) {
    try {
      const summary = await processJobs(8);
      if (summary.claimed > 0) {
        idleTicks = 0;
        console.log(
          `[worker] claimed=${summary.claimed} ok=${summary.succeeded} requeued=${summary.requeued} failed=${summary.failed}`,
        );
        for (const d of summary.details) console.log(`  · ${d.stage} ${d.id.slice(0, 8)} → ${d.outcome}`);
      } else {
        idleTicks++;
        if (idleTicks % 30 === 1) console.log("[worker] idle…");
      }
    } catch (err) {
      console.error("[worker] tick error:", err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main();
