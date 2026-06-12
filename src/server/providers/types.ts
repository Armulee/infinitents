
/**
 * Provider abstraction — business logic never talks to a vendor SDK directly.
 * Models can be swapped per-workspace (workspaces.model_preferences) or via env
 * without touching pipeline code.
 */

export interface TextGenOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TextProvider {
  readonly id: string;
  readonly label: string;
  available(): boolean;
  generateText(prompt: string, opts?: TextGenOptions): Promise<string>;
  /** Generate strict JSON matching the described shape. Throws on unparseable output. */
  generateJSON<T>(prompt: string, opts?: TextGenOptions): Promise<T>;
}

export interface ImageGenOptions {
  aspectRatio?: "9:16" | "16:9" | "1:1";
  style?: string;
}

export interface ImageResult {
  /** Public URL or base64 data URL */
  url: string;
  provider: string;
}

export interface ImageProvider {
  readonly id: string;
  readonly label: string;
  available(): boolean;
  generateImage(prompt: string, opts?: ImageGenOptions): Promise<ImageResult>;
}

export interface VideoGenOptions {
  aspectRatio?: "9:16" | "16:9" | "1:1";
  durationSeconds?: number;
  referenceImageUrl?: string;
}

export type VideoJobState =
  | { state: "running"; progress: number }
  | { state: "succeeded"; url: string; thumbnailUrl?: string; durationSeconds?: number }
  | { state: "failed"; error: string };

export interface VideoProvider {
  readonly id: string;
  readonly label: string;
  available(): boolean;
  /** Kick off an async clip generation. Returns a provider job id. */
  startClip(prompt: string, opts?: VideoGenOptions): Promise<{ providerJobId: string }>;
  /** Poll a previously started job. */
  pollClip(providerJobId: string): Promise<VideoJobState>;
}

/** Extract the first JSON object/array from model output (handles ```json fences). */
export function extractJSON<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("Model returned no JSON");
  // Walk to the matching close bracket.
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) {
      return JSON.parse(candidate.slice(start, i + 1)) as T;
    }
  }
  throw new Error("Model returned truncated JSON");
}
