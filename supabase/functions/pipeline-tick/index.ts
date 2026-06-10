// Supabase Edge Function — drives the job queue when the app is not hosted on
// a platform with built-in cron. Schedule it with pg_cron + pg_net or the
// Supabase dashboard scheduler (e.g. every minute):
//
//   select cron.schedule('pipeline-tick', '* * * * *', $$
//     select net.http_post(
//       url := '<SUPABASE_URL>/functions/v1/pipeline-tick',
//       headers := '{"Authorization": "Bearer <ANON_KEY>"}'::jsonb
//     ) $$);
//
// Required function secrets: APP_URL, CRON_SECRET (set via `supabase secrets set`).

Deno.serve(async (req: Request) => {
  const appUrl = Deno.env.get("APP_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!appUrl || !cronSecret) {
    return new Response(JSON.stringify({ error: "APP_URL / CRON_SECRET not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("task") === "schedule" ? "schedule" : "process";

  const res = await fetch(`${appUrl}/api/jobs/${target}`, {
    method: "POST",
    headers: { authorization: `Bearer ${cronSecret}` },
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
});
