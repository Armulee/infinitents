/* Demo seed — `npm run seed`.
 * Creates demo@infinitents.app / infinitents-demo with a workspace populated
 * across every pipeline stage: Brand Brain, ideas, scripts, audits,
 * storyboards, clips, review-ready videos, published posts and analytics.
 * Idempotent-ish: re-running wipes and recreates the demo workspace. */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first (see .env.example).");
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const DEMO_EMAIL = "demo@infinitents.app";
const DEMO_PASSWORD = "infinitents-demo";

const CLIPS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
];
const thumb = (seed: number) => `https://picsum.photos/seed/${seed}/720/1280`;

interface SceneSpec {
  voiceover: string;
  visual: string;
  duration: number;
}

function scriptScenes(specs: SceneSpec[]) {
  return specs.map((s, i) => ({
    index: i,
    voiceover: s.voiceover,
    visual_direction: s.visual,
    b_roll: ["Kinetic text overlay", "Cut-in detail shot"],
    duration_s: s.duration,
  }));
}

function timeline(specs: SceneSpec[], seedBase: number) {
  const scenes = specs.map((s, i) => ({
    id: `scene_${i}`,
    index: i,
    clip_url: CLIPS[(seedBase + i) % CLIPS.length],
    thumbnail_url: thumb(seedBase * 10 + i),
    trim_start: 0,
    duration: s.duration,
    transition: i === 0 ? "cut" : (["fade", "zoom", "whip", "slide"] as const)[i % 4],
    voiceover: s.voiceover,
    visual_direction: s.visual,
  }));
  const subtitles: { id: string; start: number; end: number; text: string; emphasis?: boolean }[] = [];
  let offset = 0;
  for (const scene of scenes) {
    const words = scene.voiceover.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4).join(" "));
    const per = scene.duration / chunks.length;
    chunks.forEach((text, i) =>
      subtitles.push({
        id: `sub_${scene.index}_${i}`,
        start: Math.round((offset + i * per) * 100) / 100,
        end: Math.round((offset + (i + 1) * per) * 100) / 100,
        text,
        emphasis: scene.index === 0 && i === 0,
      }),
    );
    offset += scene.duration;
  }
  return {
    version: 1,
    scenes,
    subtitles,
    audio: { music_track: "uplift-minimal", music_volume: 0.25, voiceover_volume: 1, voice: "female_energetic", ducking: true },
    caption_style: { font: "Inter", size: "md", position: "bottom", style: "bold" },
  };
}

const VIDEO_SPECS: { title: string; hook: string; pillar: string; trigger: string; scenes: SceneSpec[] }[] = [
  {
    title: "Stop posting daily — it's killing your reach",
    hook: "Stop posting daily — it's killing your reach",
    pillar: "Industry takes",
    trigger: "controversy",
    scenes: [
      { voiceover: "Stop posting daily — it's killing your reach.", visual: "Tight close-up, direct eye contact, bold hook text slams in.", duration: 3 },
      { voiceover: "The algorithm doesn't reward volume. It rewards watch time. Most daily posters burn out and ship filler.", visual: "Medium shot, red ✗ over a calendar packed with posts.", duration: 8 },
      { voiceover: "Post three bangers a week instead. Same effort, double the average views. We tested it for 60 days.", visual: "Split screen before/after with a rising views chart.", duration: 9 },
      { voiceover: "Want the full posting framework? Follow — part two drops tomorrow.", visual: "Confident smile to camera, CTA card slides up.", duration: 6 },
    ],
  },
  {
    title: "I tested AI content for 30 days. The results broke my brain",
    hook: "I tested AI content for 30 days. The results broke my brain",
    pillar: "Behind the scenes",
    trigger: "curiosity",
    scenes: [
      { voiceover: "I tested AI content for 30 days. The results broke my brain.", visual: "Whip pan onto creator holding phone, shocked expression.", duration: 3 },
      { voiceover: "Day one: 200 views. Day ten: 4,000. Day thirty? You're watching it happen right now.", visual: "Screen-recorded analytics timelapse, numbers climbing.", duration: 9 },
      { voiceover: "The trick isn't the AI. It's the feedback loop — every post teaches the system what your audience wants.", visual: "Diagram animates: post → data → better post.", duration: 9 },
      { voiceover: "Comment LOOP and I'll send you the exact setup.", visual: "Comment overlay animation with CTA.", duration: 5 },
    ],
  },
  {
    title: "3 hooks that stopped 1M scrolls this month",
    hook: "3 hooks that stopped 1M scrolls this month",
    pillar: "Educational how-tos",
    trigger: "validation",
    scenes: [
      { voiceover: "Three hooks that stopped a million scrolls this month.", visual: "Fast zoom-in, number 3 punches on screen.", duration: 3 },
      { voiceover: "One: call out the mistake. 'Stop doing X.' Two: the impossible result. 'We got 100K views with zero followers.'", visual: "Kinetic typography, each hook as a card.", duration: 9 },
      { voiceover: "Three: the open loop. 'Nobody talks about this…' Your brain physically can't scroll past an unfinished story.", visual: "Cliffhanger freeze-frame with progress bar.", duration: 8 },
      { voiceover: "Save this for your next post. You'll need it.", visual: "Save-button animation, warm CTA close.", duration: 5 },
    ],
  },
];

async function main() {
  console.log("→ Seeding Infinitents demo…");

  // 1. Demo user
  let userId: string;
  const { data: created, error: userErr } = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Founder" },
  });
  if (userErr) {
    const { data: list } = await db.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === DEMO_EMAIL);
    if (!existing) throw userErr;
    userId = existing.id;
    console.log("  · demo user exists");
  } else {
    userId = created.user.id;
    console.log("  · demo user created");
  }
  await db.from("profiles").upsert({ id: userId, email: DEMO_EMAIL, full_name: "Demo Founder" });

  // 2. Fresh workspace
  const { data: old } = await db.from("workspaces").select("id").eq("slug", "infinitents-demo");
  if (old?.length) {
    await db.from("workspaces").delete().eq("slug", "infinitents-demo");
    console.log("  · removed previous demo workspace");
  }
  const { data: ws, error: wsErr } = await db
    .from("workspaces")
    .insert({
      name: "Lumen Studio",
      slug: "infinitents-demo",
      owner_id: userId,
      daily_video_target: 3,
      autopilot: true,
    })
    .select("id")
    .single();
  if (wsErr) throw wsErr;
  const wsId = (ws as { id: string }).id;
  await db.from("workspace_members").insert({ workspace_id: wsId, user_id: userId, role: "owner" });

  // 3. Brand + Brand Brain
  const { data: brand } = await db
    .from("brands")
    .insert({
      workspace_id: wsId,
      name: "Lumen",
      website_url: "https://lumen.example.com",
      description: "Lumen helps busy founders turn expertise into daily short-form content that compounds into an audience.",
      industry: "Creator tools",
    })
    .select("id")
    .single();
  const brandId = (brand as { id: string }).id;

  await db.from("brand_knowledge").insert({
    workspace_id: wsId,
    brand_id: brandId,
    positioning: "Lumen is the effortless way for founders to turn expertise into growth — premium short-form content without the production grind.",
    audience: "Founders, marketers and solo creators aged 24–45 who know content compounds but can't sustain daily production.",
    personas: [
      { name: "Maya the Marketing Lead", age: "29", occupation: "Head of Growth at a 15-person startup", goals: ["Ship daily content without hiring", "Prove channel ROI"], frustrations: ["Agencies are slow and expensive", "Consistency collapses every launch week"] },
      { name: "Dev the Creator-Founder", age: "34", occupation: "Solo founder building an audience", goals: ["Grow to 100K followers", "Convert attention into revenue"], frustrations: ["Editing eats 4 hours per video", "Never sure which ideas will perform"] },
    ],
    pain_points: [
      "Consistency: daily posting is unsustainable manually",
      "Idea fatigue: running out of angles that perform",
      "Production cost: editing devours the calendar",
      "Attribution: impossible to tell what drives growth",
    ],
    offers: [{ name: "Lumen Pro", description: "The autonomous content department subscription", price: "$99/mo" }],
    usp: "The only system that generates, audits, edits, publishes and learns — you only approve.",
    brand_voice: {
      tone: "Confident, warm, direct. Expert but never condescending.",
      vocabulary: ["effortless", "momentum", "compounding", "signal"],
      avoid: ["hype words", "guru-speak", "emoji walls"],
      example: "Most teams don't have a content problem. They have a consistency problem. Here's how to fix it in 20 minutes a week.",
    },
    content_pillars: [
      { name: "Educational how-tos", description: "Tactical, step-by-step value", ratio: 40 },
      { name: "Behind the scenes", description: "Process and product transparency", ratio: 20 },
      { name: "Industry takes", description: "Sharp opinions on where content is going", ratio: 25 },
      { name: "Social proof", description: "Customer wins and numbers", ratio: 15 },
    ],
    learnings: [
      { insight: "Controversy-led hooks outperform on TikTok — lead with the contrarian claim in the first 1.5s.", evidence: "\"Stop posting daily\" hit 184K views with 64% avg watch.", at: new Date(Date.now() - 86_400_000).toISOString() },
      { insight: "Videos resolving the hook by the 80% mark earn 2.3× more shares — keep open loops tight.", evidence: "Share rate correlates with completion across the last 12 posts.", at: new Date(Date.now() - 86_400_000).toISOString() },
    ],
  });
  console.log("  · brand + Brand Brain ready");

  // 4. Fresh ideas in the Viral Lab
  const ideaRows = [
    { title: "Why 'post more' is dead advice in 2026", hook: "Why 'post more' is dead in 2026 (and what works now)", angle: "Contrarian take backed by retention data; position Lumen's quality-loop as the alternative.", emotional_trigger: "controversy", viral_hypothesis: "Contrarian claim vs. universal advice triggers comment debates; debate drives distribution.", content_pillar: "Industry takes", predicted_score: 88.5, status: "new" },
    { title: "POV: your content runs itself", hook: "POV: you finally fixed your content consistency", angle: "Aspirational day-in-the-life montage of the autonomous pipeline working while the founder builds.", emotional_trigger: "aspiration", viral_hypothesis: "POV format + identity payoff drives saves among founder audience.", content_pillar: "Behind the scenes", predicted_score: 82.1, status: "new" },
    { title: "We analyzed 1,000 shorts. The top 1% do this", hook: "We analyzed 1,000 shorts. Here's what the top 1% do differently", angle: "Data-driven listicle; deliver three concrete patterns with examples.", emotional_trigger: "curiosity", viral_hypothesis: "Specific number + exclusivity framing earns the first 3 seconds; payoff earns the share.", content_pillar: "Educational how-tos", predicted_score: 79.4, status: "new" },
    { title: "The 20-minute weekly content system", hook: "Your entire content week in 20 minutes — here's the system", angle: "Step-by-step walkthrough of review-only workflow.", emotional_trigger: "relief", viral_hypothesis: "Time-saving promise with concrete number converts watchers to followers.", content_pillar: "Educational how-tos", predicted_score: 74.0, status: "shortlisted" },
    { title: "From 0 to 40K followers with zero editing", hook: "The strategy that took us from 0 to 40K (zero editing)", angle: "Customer case study with real numbers and the exact cadence.", emotional_trigger: "validation", viral_hypothesis: "Proof + replicable steps = high save rate.", content_pillar: "Social proof", predicted_score: 71.8, status: "new" },
    { title: "3 AI content mistakes everyone makes", hook: "Nobody talks about these 3 AI content mistakes", angle: "Myth-busting with quick fixes; sets up Lumen's audit agent as the safety net.", emotional_trigger: "fomo", viral_hypothesis: "Mistake-framing creates loss aversion; viewers watch to check themselves.", content_pillar: "Educational how-tos", predicted_score: 69.2, status: "new" },
  ].map((i) => ({ ...i, workspace_id: wsId, brand_id: brandId, source: { model: "seed" } }));
  await db.from("generated_ideas").insert(ideaRows);
  console.log("  · 6 viral ideas");

  // 5. Three review-ready videos (full artifact chain)
  const pubJobIds: { id: string; publishedAt: string; projectId: string }[] = [];
  for (let v = 0; v < VIDEO_SPECS.length; v++) {
    const spec = VIDEO_SPECS[v];
    const { data: idea } = await db
      .from("generated_ideas")
      .insert({
        workspace_id: wsId, brand_id: brandId, title: spec.title, hook: spec.hook,
        angle: "Produced from this idea.", emotional_trigger: spec.trigger,
        viral_hypothesis: "Strong hook + tight loop.", content_pillar: spec.pillar,
        predicted_score: 80 + v, status: "in_production", source: { model: "seed" },
      })
      .select("id").single();
    const ideaId = (idea as { id: string }).id;

    const scenes = scriptScenes(spec.scenes);
    const totalDur = spec.scenes.reduce((a, s) => a + s.duration, 0);
    const { data: script } = await db
      .from("scripts")
      .insert({
        workspace_id: wsId, brand_id: brandId, idea_id: ideaId, title: spec.title, hook: spec.hook,
        voiceover: spec.scenes.map((s) => s.voiceover).join(" "),
        scenes, cta: "Follow for part two.", duration_seconds: totalDur, status: "approved",
      })
      .select("id").single();
    const scriptId = (script as { id: string }).id;

    await db.from("audit_reports").insert({
      workspace_id: wsId, script_id: scriptId, viral_score: 78 + v * 3, risk_score: 9 + v,
      verdict: "approved",
      platform_safety: { score: 96, notes: "No flagged claims; advertiser-friendly." },
      copyright_risk: { score: 97, notes: "Original content throughout." },
      clarity: { score: 88, notes: "Hook pays off by scene 3." },
      brand_alignment: { score: 91, notes: "Voice and CTA on-brand." },
      report: { summary: "Strong hook with concrete payoff. Approved for production.", strengths: ["Pattern-interrupt hook", "Tight open loop"], risks: ["Scene 2 pacing"], fixes: [] },
    });

    const { data: board } = await db
      .from("storyboards")
      .insert({
        workspace_id: wsId, script_id: scriptId,
        scenes: spec.scenes.map((s, i) => ({
          index: i, description: s.visual,
          camera_direction: i === 0 ? "Tight close-up, slow push-in" : "Medium shot, handheld energy",
          composition: "Subject centered, text-safe lower third",
          transition_note: i === 0 ? "Hard cut in" : "Punch-in zoom", duration_s: s.duration,
        })),
      })
      .select("id").single();
    const boardId = (board as { id: string }).id;

    await db.from("image_references").insert(
      (["character", "environment", "mood"] as const).map((kind, k) => ({
        workspace_id: wsId, storyboard_id: boardId, scene_index: 0, kind,
        prompt: `${kind} reference for ${spec.title}`, provider: "seed",
        url: thumb(900 + v * 10 + k), status: "ready",
      })),
    );

    const statuses = ["ready_for_review", "ready_for_review", "published"] as const;
    const status = statuses[v];
    const { data: project } = await db
      .from("video_projects")
      .insert({
        workspace_id: wsId, brand_id: brandId, idea_id: ideaId, script_id: scriptId, storyboard_id: boardId,
        title: spec.title, status,
        timeline: timeline(spec.scenes, v + 1),
        prompt_pack: { scene_count: spec.scenes.length, parallel_jobs: spec.scenes.length, prompts: spec.scenes.map((s, i) => ({ scene_index: i, prompt: s.visual, duration_s: s.duration })) },
        thumbnail_url: thumb((v + 1) * 10),
        duration_seconds: totalDur,
        ...(status === "published" ? { approved_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), approved_by: userId } : {}),
      })
      .select("id").single();
    const projectId = (project as { id: string }).id;

    await db.from("generated_videos").insert(
      spec.scenes.map((s, i) => ({
        workspace_id: wsId, project_id: projectId, scene_index: i,
        prompt: s.visual, provider: "seedance", status: "ready",
        url: CLIPS[(v + 1 + i) % CLIPS.length], thumbnail_url: thumb((v + 1) * 10 + i),
        duration_seconds: s.duration,
      })),
    );

    if (status === "published") {
      const publishedAt = new Date(Date.now() - 2.5 * 86_400_000).toISOString();
      const { data: conn } = await db
        .from("platform_connections")
        .insert({ workspace_id: wsId, platform: "tiktok", handle: "@lumen.studio", display_name: "Lumen Studio", status: "connected", metadata: { sandbox: true } })
        .select("id").single();
      await db.from("platform_connections").insert([
        { workspace_id: wsId, platform: "instagram", handle: "@lumen.studio", display_name: "Lumen Studio", status: "connected", metadata: { sandbox: true } },
        { workspace_id: wsId, platform: "youtube", handle: "@LumenStudio", display_name: "Lumen Studio", status: "connected", metadata: { sandbox: true } },
      ]);
      const { data: pub } = await db
        .from("publishing_jobs")
        .insert({
          workspace_id: wsId, project_id: projectId, connection_id: (conn as { id: string }).id,
          platform: "tiktok", caption: spec.title, hashtags: ["contentstrategy", "founders"],
          scheduled_at: publishedAt, published_at: publishedAt, status: "published",
          external_id: `sim_seed_${v}`, external_url: "https://www.tiktok.com/@lumen.studio",
        })
        .select("id").single();
      pubJobIds.push({ id: (pub as { id: string }).id, publishedAt, projectId });
    }
    console.log(`  · video ${v + 1}/3: "${spec.title.slice(0, 44)}…" → ${status}`);
  }

  // 6. Analytics history (3 days of snapshots for the published video)
  for (const pub of pubJobIds) {
    const rows = [];
    for (let day = 2; day >= 0; day--) {
      const collected = new Date(Date.now() - day * 86_400_000);
      const growth = 1 - day * 0.32;
      rows.push({
        workspace_id: wsId, project_id: pub.projectId, publishing_job_id: pub.id, platform: "tiktok",
        views: Math.round(184_000 * growth), likes: Math.round(12_400 * growth),
        comments: Math.round(890 * growth), shares: Math.round(2_150 * growth),
        saves: Math.round(1_730 * growth), watch_time_seconds: Math.round(184_000 * growth * 16),
        avg_watch_pct: 64.2, followers_delta: Math.round(610 * growth),
        revenue_cents: Math.round(48_200 * growth), collected_at: collected.toISOString(),
      });
    }
    await db.from("analytics").insert(rows);
  }
  console.log("  · analytics history");

  // 7. A couple of live-looking jobs for the Factory
  // (batch rows must share identical keys — PostgREST nullifies gaps)
  await db.from("ai_jobs").insert([
    {
      workspace_id: wsId,
      stage: "idea_generation",
      status: "succeeded",
      progress: 100,
      payload: { brand_id: brandId, count: 6 },
      brand_id: brandId,
      scheduled_at: new Date(Date.now() - 3_600_000).toISOString(),
      finished_at: new Date().toISOString(),
      result: { generated: 6 },
    },
    {
      workspace_id: wsId,
      stage: "analytics_sync",
      status: "queued",
      progress: 0,
      payload: {},
      brand_id: null,
      scheduled_at: new Date(Date.now() + 3_600_000).toISOString(),
      finished_at: null,
      result: null,
    },
  ]);

  console.log("\n✓ Seed complete.\n");
  console.log(`  Sign in:   ${DEMO_EMAIL}`);
  console.log(`  Password:  ${DEMO_PASSWORD}\n`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
