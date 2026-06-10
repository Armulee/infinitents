
import type { Brand, BrandKnowledge } from "@/lib/types";
import { getTextProvider } from "@/server/providers/registry";
import { brandExtractionPrompt, type BrandExtractionResult } from "../prompts";
import { payloadStr, type StageHandler } from "../context";

/** Best-effort website text extraction for richer brand context. */
async function fetchWebsiteText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; InfinitentsBot/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16_000);
  } catch {
    return null;
  }
}

/**
 * brand_extraction — Website URL + business description → Brand Brain.
 * Uses the strongest available reasoning model.
 */
export const brandExtraction: StageHandler = async ({ db, job, workspace, setProgress }) => {
  const brandId = payloadStr(job, "brand_id");

  const { data: brand, error } = await db.from("brands").select("*").eq("id", brandId).single();
  if (error || !brand) throw new Error(`brand ${brandId} not found`);
  const b = brand as Brand;

  await setProgress(10, "Reading brand sources");
  const websiteText = b.website_url ? await fetchWebsiteText(b.website_url) : null;

  await setProgress(35, "Extracting brand knowledge");
  const provider = getTextProvider("brand_extraction", workspace.model_preferences);
  const { system, prompt } = brandExtractionPrompt({
    name: b.name,
    websiteUrl: b.website_url,
    description: b.description,
    websiteText,
  });
  const extracted = await provider.generateJSON<BrandExtractionResult>(prompt, {
    system,
    temperature: 0.4,
    maxTokens: 8192,
  });

  await setProgress(80, "Saving Brand Brain");
  const { data: existing } = await db
    .from("brand_knowledge")
    .select("id, version")
    .eq("brand_id", brandId)
    .maybeSingle();

  const row = {
    workspace_id: job.workspace_id,
    brand_id: brandId,
    positioning: extracted.positioning,
    audience: extracted.audience,
    personas: extracted.personas,
    pain_points: extracted.pain_points,
    offers: extracted.offers,
    usp: extracted.usp,
    brand_voice: extracted.brand_voice,
    content_pillars: extracted.content_pillars,
    raw: { model: provider.id, extracted_at: new Date().toISOString(), had_website_text: Boolean(websiteText) },
  };

  if (existing) {
    const ex = existing as Pick<BrandKnowledge, "id" | "version">;
    await db
      .from("brand_knowledge")
      .update({ ...row, version: ex.version + 1 })
      .eq("id", ex.id);
  } else {
    await db.from("brand_knowledge").insert(row);
  }

  return { result: { provider: provider.id, pillars: extracted.content_pillars.length } };
};
