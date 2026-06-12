
import type { PipelineStage } from "@/lib/types";
import { mockImageProvider, mockTextProvider, mockVideoProvider } from "./mock";
import { anthropicProvider, googleProvider, openaiProvider } from "./text";
import { fluxProvider, gptImageProvider } from "./image";
import { klingProvider, seedanceProvider, veoProvider } from "./video";
import type { ImageProvider, TextProvider, VideoProvider } from "./types";

export const TEXT_PROVIDERS: TextProvider[] = [anthropicProvider, openaiProvider, googleProvider];
export const IMAGE_PROVIDERS: ImageProvider[] = [gptImageProvider, fluxProvider];
export const VIDEO_PROVIDERS: VideoProvider[] = [seedanceProvider, veoProvider, klingProvider];

export type ProviderKind = "text" | "image" | "video";

/** Which kind of model each pipeline stage consumes. */
export const STAGE_PROVIDER_KIND: Record<PipelineStage, ProviderKind | null> = {
  brand_extraction: "text",
  idea_generation: "text",
  script_generation: "text",
  audit: "text",
  storyboard: "text",
  image_generation: "image",
  prompt_packing: "text",
  video_generation: "video",
  editing: "text",
  publishing: null,
  analytics_sync: null,
};

/** Stage defaults per ai-pipeline.md (strongest reasoning for extraction/audit). */
const STAGE_DEFAULTS: Partial<Record<PipelineStage, string>> = {
  brand_extraction: "anthropic",
  idea_generation: "anthropic",
  script_generation: "anthropic",
  audit: "anthropic",
  storyboard: "anthropic",
  image_generation: "gpt-image",
  prompt_packing: "anthropic",
  video_generation: "seedance",
  editing: "anthropic",
};

function pick<P extends { id: string; available(): boolean }>(
  pool: P[],
  preferred: string | undefined,
  fallback: P,
): P {
  if (preferred) {
    const exact = pool.find((p) => p.id === preferred);
    if (exact?.available()) return exact;
  }
  const firstAvailable = pool.find((p) => p.available());
  return firstAvailable ?? fallback;
}

export interface ProviderPrefs {
  /** workspaces.model_preferences — per-stage provider id overrides */
  [stage: string]: string | undefined;
}

export function getTextProvider(stage: PipelineStage, prefs: ProviderPrefs = {}): TextProvider {
  return pick(TEXT_PROVIDERS, prefs[stage] ?? STAGE_DEFAULTS[stage], mockTextProvider);
}

export function getImageProvider(stage: PipelineStage, prefs: ProviderPrefs = {}): ImageProvider {
  return pick(IMAGE_PROVIDERS, prefs[stage] ?? STAGE_DEFAULTS[stage], mockImageProvider);
}

export function getVideoProvider(stage: PipelineStage, prefs: ProviderPrefs = {}): VideoProvider {
  return pick(VIDEO_PROVIDERS, prefs[stage] ?? STAGE_DEFAULTS[stage], mockVideoProvider);
}

/** Exposed to Settings → AI Models so users can swap providers per stage. */
export function listProviderOptions() {
  return {
    text: TEXT_PROVIDERS.map((p) => ({ id: p.id, label: p.label, available: p.available() })),
    image: IMAGE_PROVIDERS.map((p) => ({ id: p.id, label: p.label, available: p.available() })),
    video: VIDEO_PROVIDERS.map((p) => ({ id: p.id, label: p.label, available: p.available() })),
  };
}
