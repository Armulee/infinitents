
import type {
  AuditVerdict,
  BrandKnowledge,
  ContentPillar,
  GeneratedIdea,
  Persona,
  ScriptScene,
  StoryboardScene,
} from "@/lib/types";

/**
 * Prompt builders for every pipeline stage.
 *
 * Each prompt embeds an example output between MOCK_SHAPE / END_MOCK_SHAPE.
 * Real providers treat it as a few-shot shape example; the mock provider
 * returns it verbatim so the full pipeline runs without API keys. Mock values
 * are built from real brand data so demo output reads like production output.
 */

function shape(example: unknown): string {
  return `\n\nReturn JSON with exactly this shape (example values shown):\nMOCK_SHAPE:${JSON.stringify(example)}END_MOCK_SHAPE`;
}

function seeded(seedStr: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}

function pickFrom<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Brand extraction ─────────────────────────────────────────────────────────

export interface BrandExtractionResult {
  positioning: string;
  audience: string;
  personas: Persona[];
  pain_points: string[];
  offers: { name: string; description: string; price?: string }[];
  usp: string;
  brand_voice: { tone: string; vocabulary: string[]; avoid: string[]; example: string };
  content_pillars: ContentPillar[];
}

export function brandExtractionPrompt(input: {
  name: string;
  websiteUrl?: string | null;
  description?: string | null;
  websiteText?: string | null;
}): { system: string; prompt: string } {
  const example: BrandExtractionResult = {
    positioning: `${input.name} is the effortless way for modern teams to turn expertise into growth — premium results without premium overhead.`,
    audience: `Founders, marketers and creators aged 24–45 who need consistent, high-quality short-form content but don't have time to produce it.`,
    personas: [
      {
        name: "Maya the Marketing Lead",
        age: "29",
        occupation: "Head of Growth at a 15-person startup",
        goals: ["Ship daily content without hiring", "Prove channel ROI"],
        frustrations: ["Agencies are slow and expensive", "Posting consistency collapses every launch week"],
      },
      {
        name: "Dev the Creator-Founder",
        age: "34",
        occupation: "Solo founder building an audience",
        goals: ["Grow to 100K followers", "Convert attention into revenue"],
        frustrations: ["Editing eats 4 hours per video", "Never sure which ideas will perform"],
      },
    ],
    pain_points: [
      "Consistency: daily posting is unsustainable manually",
      "Idea fatigue: running out of angles that perform",
      "Production cost: editing and design devour the calendar",
      "Attribution: impossible to tell what actually drives growth",
    ],
    offers: [
      { name: "Core offering", description: `${input.name}'s flagship product/service`, price: "$" },
    ],
    usp: `The only solution that combines speed, brand consistency and measurable growth in one system.`,
    brand_voice: {
      tone: "Confident, warm, direct. Expert but never condescending.",
      vocabulary: ["effortless", "momentum", "compounding", "signal"],
      avoid: ["hype words", "guru-speak", "emoji walls", "clickbait promises"],
      example: "Most teams don't have a content problem. They have a consistency problem. Here's how to fix it in 20 minutes a week.",
    },
    content_pillars: [
      { name: "Educational how-tos", description: "Tactical, step-by-step value for the core audience", ratio: 40 },
      { name: "Behind the scenes", description: "Process, team and product transparency", ratio: 20 },
      { name: "Industry takes", description: "Sharp opinions on where the market is going", ratio: 25 },
      { name: "Social proof", description: "Customer wins, transformations and numbers", ratio: 15 },
    ],
  };

  return {
    system:
      "You are a world-class brand strategist who has positioned hundreds of consumer and B2B brands. You extract sharp, specific, non-generic brand knowledge. Every sentence must be usable by a content team tomorrow morning.",
    prompt: `Analyze this brand and produce its complete Brand Brain.

Brand name: ${input.name}
Website: ${input.websiteUrl ?? "n/a"}
Business description: ${input.description ?? "n/a"}
${input.websiteText ? `\nWebsite content (extracted):\n${input.websiteText.slice(0, 12000)}` : ""}

Extract: positioning, audience, 2–4 personas, pain points, offers, USP, brand voice (tone, vocabulary, words to avoid, one example caption), and 3–5 content pillars with percentage ratios summing to 100.

Be specific to THIS brand — no generic filler.${shape(example)}`,
  };
}

// ── Viral idea engine ────────────────────────────────────────────────────────

export interface IdeaResult {
  title: string;
  hook: string;
  angle: string;
  emotional_trigger: string;
  viral_hypothesis: string;
  content_pillar: string;
  predicted_score: number;
}

const HOOK_PATTERNS = [
  "Stop doing {x} — it's killing your {y}",
  "I tested {x} for 30 days. The results broke my brain",
  "Nobody talks about this {x} mistake",
  "The {x} strategy that took us from 0 to {y}",
  "POV: you finally fixed your {x}",
  "3 {x} secrets your competitors pray you never learn",
  "Why {x} is dead in 2026 (and what works now)",
  "We analyzed 1,000 {x}. Here's what the top 1% do differently",
];

const TRIGGERS = ["curiosity", "FOMO", "surprise", "validation", "aspiration", "controversy", "relief"];

export function ideaGenerationPrompt(input: {
  knowledge: BrandKnowledge | null;
  brandName: string;
  count: number;
  learnings: string[];
  recentTopIdeas: string[];
}): { system: string; prompt: string } {
  const rng = seeded(`${input.brandName}_${new Date().toISOString().slice(0, 10)}`);
  const pillars = input.knowledge?.content_pillars?.length
    ? input.knowledge.content_pillars
    : [{ name: "Educational how-tos", description: "", ratio: 100 }];

  const examples: IdeaResult[] = Array.from({ length: input.count }).map((_, i) => {
    const pillar = pillars[i % pillars.length];
    const pattern = pickFrom(rng, HOOK_PATTERNS);
    const pain = input.knowledge?.pain_points?.[i % Math.max(1, input.knowledge.pain_points.length)] ?? "wasting hours on content";
    const hook = pattern
      .replace("{x}", pain.split(":")[0].toLowerCase().trim())
      .replace("{y}", pickFrom(rng, ["growth", "reach", "revenue", "100K views"]));
    return {
      title: `${pillar.name}: ${hook.slice(0, 56)}`,
      hook,
      angle: `Frame ${input.brandName} expertise against "${pain}" with a concrete before/after and one actionable step viewers can take today.`,
      emotional_trigger: pickFrom(rng, TRIGGERS),
      viral_hypothesis: `Pattern-interrupt hook + specific numbers drives 3s retention; the payoff at 80% triggers shares among ${(input.knowledge?.audience ?? "the target audience").slice(0, 60)}.`,
      content_pillar: pillar.name,
      predicted_score: Math.round((62 + rng() * 33) * 10) / 10,
    };
  });

  return {
    system:
      "You are a short-form content strategist with a track record of repeated 1M+ view videos on TikTok, Reels and Shorts. You understand hooks, retention curves, and platform psychology deeply. You never produce generic ideas.",
    prompt: `Generate ${input.count} viral short-form video ideas for ${input.brandName}.

BRAND KNOWLEDGE:
${JSON.stringify(
      {
        positioning: input.knowledge?.positioning,
        audience: input.knowledge?.audience,
        pain_points: input.knowledge?.pain_points,
        usp: input.knowledge?.usp,
        voice: input.knowledge?.brand_voice,
        pillars: input.knowledge?.content_pillars,
      },
      null,
      2,
    )}

WHAT WE'VE LEARNED FROM PERFORMANCE DATA (weight heavily):
${input.learnings.length ? input.learnings.map((l) => `- ${l}`).join("\n") : "- No data yet — diversify across pillars to learn fast."}

RECENTLY USED IDEAS (do not repeat):
${input.recentTopIdeas.length ? input.recentTopIdeas.map((t) => `- ${t}`).join("\n") : "- none"}

For each idea provide: title, hook (the literal first line spoken/shown — must stop the scroll in 1.5s), angle, emotional_trigger, viral_hypothesis (why this will spread, mechanically), content_pillar (one of the brand's pillars), predicted_score (0–100, honest).

Distribute ideas across pillars by their ratios. Return a JSON array of ${input.count} ideas.${shape(examples)}`,
  };
}

// ── Script generation ────────────────────────────────────────────────────────

export interface ScriptResult {
  title: string;
  hook: string;
  voiceover: string;
  scenes: ScriptScene[];
  cta: string;
  duration_seconds: number;
}

export function scriptGenerationPrompt(input: {
  idea: Pick<GeneratedIdea, "title" | "hook" | "angle" | "emotional_trigger" | "viral_hypothesis">;
  knowledge: BrandKnowledge | null;
  brandName: string;
  revisionNotes?: string;
}): { system: string; prompt: string } {
  const hook = input.idea.hook;
  const example: ScriptResult = {
    title: input.idea.title,
    hook,
    voiceover: `${hook} Here's the thing nobody tells you. Most people get this completely wrong — and it costs them every single day. Step one: identify the real bottleneck, not the loud one. Step two: fix the system, not the symptom. We did exactly this and the results compounded within two weeks. Want the full playbook? Follow for part two.`,
    scenes: [
      { index: 0, voiceover: hook, visual_direction: "Tight close-up, direct eye contact, bold text overlay of the hook. High energy, instant pattern interrupt.", b_roll: ["Fast push-in on subject", "Hook text slams on screen"], duration_s: 3 },
      { index: 1, voiceover: "Here's the thing nobody tells you. Most people get this completely wrong — and it costs them every single day.", visual_direction: "Cut to medium shot, hands gesturing. Overlay: red ✗ over the 'wrong way' visual.", b_roll: ["Screen recording of common mistake", "Frustrated user moment"], duration_s: 7 },
      { index: 2, voiceover: "Step one: identify the real bottleneck, not the loud one. Step two: fix the system, not the symptom.", visual_direction: "Split screen: before/after. Numbered steps animate in as kinetic captions.", b_roll: ["Step 1 + Step 2 motion text", "Process timelapse"], duration_s: 10 },
      { index: 3, voiceover: "We did exactly this and the results compounded within two weeks. Want the full playbook? Follow for part two.", visual_direction: "Results chart rising; end on confident smile to camera with CTA card.", b_roll: ["Analytics graph going up", "CTA end-card"], duration_s: 8 },
    ],
    cta: "Follow for part two — the full playbook.",
    duration_seconds: 28,
  };

  return {
    system: `You are an elite short-form scriptwriter. Your scripts consistently hold >60% average watch time. You write for the ear (spoken word), front-load value, and engineer rewatches. Brand voice: ${JSON.stringify(input.knowledge?.brand_voice ?? {})}.`,
    prompt: `Write a complete short-form video script for ${input.brandName}.

IDEA:
${JSON.stringify(input.idea, null, 2)}

REQUIREMENTS:
- 20–35 seconds total. 3–5 scenes.
- Scene 0 is the hook: ≤3 seconds, must re-state or sharpen the idea's hook.
- Optimize for retention (open loops, pattern interrupts every ~7s), engagement (a moment worth commenting on) and shareability (a line worth sending to a friend).
- voiceover: the full spoken script as one string.
- scenes[]: index, voiceover (that scene's lines), visual_direction (camera + on-screen text + energy), b_roll (2–3 specific shots), duration_s.
- End with a CTA aligned to the brand.
${input.revisionNotes ? `\nREVISION NOTES FROM AUDIT (must address):\n${input.revisionNotes}` : ""}${shape(example)}`,
  };
}

// ── Audit agent ──────────────────────────────────────────────────────────────

export interface AuditResult {
  viral_score: number;
  risk_score: number;
  verdict: AuditVerdict;
  platform_safety: { score: number; notes: string };
  copyright_risk: { score: number; notes: string };
  clarity: { score: number; notes: string };
  brand_alignment: { score: number; notes: string };
  report: { summary: string; strengths: string[]; risks: string[]; fixes: string[] };
}

export function auditPrompt(input: {
  script: { title: string; voiceover: string; scenes: ScriptScene[]; cta: string | null };
  knowledge: BrandKnowledge | null;
}): { system: string; prompt: string } {
  const example: AuditResult = {
    viral_score: 81,
    risk_score: 12,
    verdict: "approved",
    platform_safety: { score: 96, notes: "No flagged claims, no restricted topics, advertiser-friendly." },
    copyright_risk: { score: 95, notes: "All content original; no third-party audio or footage referenced." },
    clarity: { score: 88, notes: "One idea per scene; hook promise is paid off by scene 3." },
    brand_alignment: { score: 90, notes: "Tone matches brand voice; CTA consistent with positioning." },
    report: {
      summary: "Strong hook with a concrete payoff. Retention structure is sound. Approved for production.",
      strengths: ["Pattern-interrupt hook under 3s", "Open loop resolved at 80% mark", "Comment-bait moment in scene 2"],
      risks: ["Scene 2 runs slightly long — watch pacing"],
      fixes: ["Tighten scene 2 voiceover by ~1 second if possible"],
    },
  };

  return {
    system:
      "You are a ruthless content auditor for a media company. You protect the brand from platform strikes, copyright claims and mediocrity. You score honestly — most scripts are not 90s. Scripts scoring below standards must not pass.",
    prompt: `Audit this short-form script before production.

SCRIPT:
${JSON.stringify(input.script, null, 2)}

BRAND CONTEXT:
${JSON.stringify({ voice: input.knowledge?.brand_voice, positioning: input.knowledge?.positioning, avoid: input.knowledge?.brand_voice?.avoid }, null, 2)}

Evaluate each dimension 0–100 with specific notes:
1. platform_safety — TikTok/IG/YT/FB policy compliance, advertiser-friendliness, no medical/financial claims issues
2. copyright_risk — higher score = safer (no third-party IP, music, footage)
3. clarity — one idea per scene, hook payoff, comprehension at 1x speed
4. brand_alignment — voice, positioning, vocabulary, things to avoid

Then output:
- viral_score (0–100): honest virality potential
- risk_score (0–100): overall risk, higher = riskier
- verdict: "approved" (safe + viral_score ≥ 60), "needs_revision" (fixable issues), or "rejected" (unsafe or fundamentally weak)
- report: summary, strengths[], risks[], fixes[] (concrete edits if needs_revision)${shape(example)}`,
  };
}

// ── Storyboard agent ─────────────────────────────────────────────────────────

export interface StoryboardResult {
  scenes: StoryboardScene[];
}

export function storyboardPrompt(input: {
  script: { title: string; scenes: ScriptScene[] };
}): { system: string; prompt: string } {
  const example: StoryboardResult = {
    scenes: input.script.scenes.map((s, i) => ({
      index: i,
      description: `Scene ${i + 1}: ${s.visual_direction?.slice(0, 90) ?? "Visualize the voiceover"}`,
      camera_direction: i === 0 ? "Tight close-up, slow push-in, eye-level, shallow depth of field" : i % 2 === 0 ? "Medium shot, handheld energy, slight dutch angle" : "Wide establishing, smooth gimbal lateral move",
      composition: i === 0 ? "Subject centered, rule of thirds on eyes, negative space top for hook text" : "Leading lines toward subject, text-safe lower third, high contrast against background",
      transition_note: i === 0 ? "Hard cut in" : i % 3 === 0 ? "Whip pan into scene" : i % 2 === 0 ? "Punch-in zoom transition" : "Match-cut on motion",
      duration_s: s.duration_s,
    })),
  };

  return {
    system:
      "You are a commercial director who storyboards viral vertical video. You think in 9:16, in thumb-stopping first frames, and in motion that earns the next second of attention.",
    prompt: `Create a production storyboard for this script (9:16 vertical).

SCRIPT SCENES:
${JSON.stringify(input.script.scenes, null, 2)}

For every scene output: index, description (what the viewer sees, specific), camera_direction (shot size, angle, movement), composition (framing, text-safe areas, contrast), transition_note (how we enter/exit), duration_s (copy from script).${shape(example)}`,
  };
}

// ── Image reference prompts ──────────────────────────────────────────────────

export function imageReferencePrompts(input: {
  storyboardScenes: StoryboardScene[];
  brandName: string;
  positioning?: string | null;
}): { kind: "character" | "environment" | "mood"; scene_index: number; prompt: string }[] {
  const first = input.storyboardScenes[0];
  const mid = input.storyboardScenes[Math.floor(input.storyboardScenes.length / 2)] ?? first;
  return [
    {
      kind: "character",
      scene_index: 0,
      prompt: `Photorealistic portrait of the on-camera presenter for a ${input.brandName} short-form video. ${first?.camera_direction ?? "Close-up, eye-level"}. Confident, warm, premium casual wardrobe, soft key light, 9:16 vertical, cinematic color grade.`,
    },
    {
      kind: "environment",
      scene_index: mid?.index ?? 0,
      prompt: `Environment plate for: ${mid?.description ?? "modern creative studio"}. ${mid?.composition ?? "Leading lines, high contrast"}. Premium, minimal, depth of field, 9:16 vertical, natural light with practicals.`,
    },
    {
      kind: "mood",
      scene_index: 0,
      prompt: `Mood and color reference frame for a ${input.brandName} brand film. ${input.positioning ?? ""} Premium minimal aesthetic, confident contrast, restrained palette with one accent color, filmic grain, 9:16 vertical.`,
    },
  ];
}

// ── Prompt packing ───────────────────────────────────────────────────────────

export interface PromptPackResult {
  scene_count: number;
  parallel_jobs: number;
  prompts: { scene_index: number; prompt: string; duration_s: number }[];
  notes: string;
}

export function promptPackingPrompt(input: {
  storyboardScenes: StoryboardScene[];
  scriptScenes: ScriptScene[];
  brandName: string;
}): { system: string; prompt: string } {
  const example: PromptPackResult = {
    scene_count: input.storyboardScenes.length,
    parallel_jobs: Math.min(input.storyboardScenes.length, 4),
    prompts: input.storyboardScenes.map((s) => ({
      scene_index: s.index,
      prompt: `${s.description} ${s.camera_direction}. ${s.composition}. Premium commercial grade, photoreal, 9:16 vertical video, smooth motion, no text artifacts, consistent protagonist across scenes.`,
      duration_s: s.duration_s,
    })),
    notes: "One generation job per scene; consistent character via shared descriptor; transitions handled in edit.",
  };

  return {
    system:
      "You are a video-generation prompt engineer. You translate storyboards into provider-optimized prompts that maximize visual consistency across scenes and avoid artifacts (text, hands, morphing).",
    prompt: `Analyze this storyboard and pack it into optimized video-generation prompts for ${input.brandName}.

STORYBOARD:
${JSON.stringify(input.storyboardScenes, null, 2)}

SCRIPT (for context on energy/voiceover):
${JSON.stringify(input.scriptScenes.map((s) => ({ index: s.index, voiceover: s.voiceover })), null, 2)}

Determine: scene_count, parallel_jobs (how many to generate concurrently, ≤4), prompts[] (scene_index, prompt — self-contained, includes camera+composition+style+'9:16 vertical', repeats the protagonist descriptor verbatim in every scene for consistency, duration_s), notes.${shape(example)}`,
  };
}

// ── Learning loop ────────────────────────────────────────────────────────────

export interface LearningResult {
  learnings: { insight: string; evidence: string }[];
}

export function learningLoopPrompt(input: {
  brandName: string;
  performance: {
    title: string;
    platform: string;
    views: number;
    avg_watch_pct: number;
    shares: number;
    likes: number;
    pillar?: string | null;
    trigger?: string | null;
  }[];
}): { system: string; prompt: string } {
  const top = [...input.performance].sort((a, b) => b.views - a.views)[0];
  const example: LearningResult = {
    learnings: [
      {
        insight: `${top?.trigger ?? "Curiosity"}-driven hooks outperform — double down on "${top?.pillar ?? "Educational how-tos"}" next cycle.`,
        evidence: `"${top?.title?.slice(0, 60) ?? "Top video"}" hit ${top?.views?.toLocaleString() ?? "120,000"} views with ${top?.avg_watch_pct ?? 62}% avg watch.`,
      },
      {
        insight: "Videos that resolve the hook by the 80% mark earn disproportionate shares — keep open loops tight.",
        evidence: "Share rate correlates with watch completion across the last batch.",
      },
    ],
  };

  return {
    system:
      "You are a growth analyst for a content studio. You find the causal pattern, not the vanity metric, and you write learnings the idea engine can act on directly.",
    prompt: `Analyze the latest performance data for ${input.brandName} and produce 2–4 actionable learnings for the idea and script engines.

PERFORMANCE (latest sync):
${JSON.stringify(input.performance, null, 2)}

Each learning: insight (specific, directive — what to do more/less of) and evidence (the data that supports it).${shape(example)}`,
  };
}
