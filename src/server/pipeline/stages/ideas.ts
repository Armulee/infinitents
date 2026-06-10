
import type { BrandKnowledge, Learning } from "@/lib/types";
import { getTextProvider } from "@/server/providers/registry";
import { ideaGenerationPrompt, type IdeaResult } from "../prompts";
import { payloadNum, payloadStr, type StageHandler } from "../context";

/**
 * idea_generation — Brand Knowledge + learnings + trends → N viral ideas.
 * The scheduler requests 2 × daily_video_target per product.md.
 */
export const ideaGeneration: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const brandId = payloadStr(job, "brand_id");
  const count = Math.min(payloadNum(job, "count", workspace.daily_video_target * 2), 50);

  await setProgress(10, "Loading Brand Brain");
  const [{ data: knowledge }, { data: brand }, { data: recentIdeas }] = await Promise.all([
    db.from("brand_knowledge").select("*").eq("brand_id", brandId).maybeSingle(),
    db.from("brands").select("name").eq("id", brandId).single(),
    db
      .from("generated_ideas")
      .select("title")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!brand) throw new Error(`brand ${brandId} not found`);

  const k = (knowledge as BrandKnowledge | null) ?? null;
  const learnings = (k?.learnings ?? []).slice(0, 6).map((l: Learning) => l.insight);

  await setProgress(40, `Generating ${count} ideas`);
  const provider = getTextProvider("idea_generation", workspace.model_preferences);
  const { system, prompt } = ideaGenerationPrompt({
    knowledge: k,
    brandName: (brand as { name: string }).name,
    count,
    learnings,
    recentTopIdeas: ((recentIdeas ?? []) as { title: string }[]).map((i) => i.title),
  });
  const ideas = await provider.generateJSON<IdeaResult[]>(prompt, {
    system,
    temperature: 0.9,
    maxTokens: 8192,
  });

  await setProgress(85, "Saving ideas");
  const rows = ideas.slice(0, count).map((i) => ({
    workspace_id: job.workspace_id,
    brand_id: brandId,
    title: i.title,
    hook: i.hook,
    angle: i.angle,
    emotional_trigger: i.emotional_trigger,
    viral_hypothesis: i.viral_hypothesis,
    content_pillar: i.content_pillar,
    predicted_score: Math.max(0, Math.min(100, i.predicted_score)),
    status: "new",
    source: { model: provider.id, learnings },
  }));
  const { error } = await db.from("generated_ideas").insert(rows);
  if (error) throw new Error(`insert ideas: ${error.message}`);

  return { result: { generated: rows.length, provider: provider.id } };
};
