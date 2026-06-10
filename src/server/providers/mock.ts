
import type {
  ImageProvider,
  TextProvider,
  VideoJobState,
  VideoProvider,
} from "./types";

/**
 * Deterministic mock providers.
 * They keep the entire pipeline runnable in development and CI without API
 * keys, and act as a graceful fallback if a vendor is down. Every call logs a
 * warning so a misconfigured production deploy is loud, not silent.
 */

function warn(kind: string) {
  console.warn(
    `[providers] No ${kind} provider configured — using deterministic mock output. Set the relevant API key in .env for real generation.`,
  );
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const mockTextProvider: TextProvider = {
  id: "mock",
  label: "Mock (no API key)",
  available: () => true,
  async generateText(prompt) {
    warn("text");
    return `Mock response for: ${prompt.slice(0, 80)}…`;
  },
  async generateJSON<T>(prompt: string): Promise<T> {
    warn("text");
    // The pipeline stages pass a `MOCK_SHAPE:` hint so mocks return valid data.
    const hint = prompt.match(/MOCK_SHAPE:([\s\S]*?)END_MOCK_SHAPE/);
    if (hint) return JSON.parse(hint[1]) as T;
    throw new Error("Mock text provider needs a MOCK_SHAPE hint in the prompt");
  },
};

// Curated, on-brand placeholder photography (Unsplash source is unstable; use picsum seeds).
export const mockImageProvider: ImageProvider = {
  id: "mock",
  label: "Mock (no API key)",
  available: () => true,
  async generateImage(prompt, opts = {}) {
    warn("image");
    const seed = hash(prompt) % 1000;
    const [w, h] =
      opts.aspectRatio === "16:9" ? [1280, 720] : opts.aspectRatio === "1:1" ? [900, 900] : [720, 1280];
    return { url: `https://picsum.photos/seed/${seed}/${w}/${h}`, provider: "mock" };
  },
};

/** Public-domain sample clips (Google sample bucket) so the queue/editor are playable. */
const SAMPLE_CLIPS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
];

const mockVideoJobs = new Map<string, { startedAt: number; prompt: string }>();

export const mockVideoProvider: VideoProvider = {
  id: "mock",
  label: "Mock (no API key)",
  available: () => true,
  async startClip(prompt) {
    warn("video");
    const id = `mock_${hash(prompt)}_${Date.now()}`;
    mockVideoJobs.set(id, { startedAt: Date.now(), prompt });
    return { providerJobId: id };
  },
  async pollClip(providerJobId): Promise<VideoJobState> {
    const job = mockVideoJobs.get(providerJobId) ?? {
      startedAt: Date.now() - 30_000,
      prompt: providerJobId,
    };
    const elapsed = Date.now() - job.startedAt;
    // Simulate ~8s of generation so realtime progress is visible in the UI.
    if (elapsed < 8_000) {
      return { state: "running", progress: Math.min(95, Math.round((elapsed / 8_000) * 100)) };
    }
    const url = SAMPLE_CLIPS[hash(job.prompt) % SAMPLE_CLIPS.length];
    const seed = hash(job.prompt) % 1000;
    return {
      state: "succeeded",
      url,
      thumbnailUrl: `https://picsum.photos/seed/${seed}/720/1280`,
      durationSeconds: 15,
    };
  },
};
