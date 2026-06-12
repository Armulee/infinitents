
import type { VideoGenOptions, VideoJobState, VideoProvider } from "./types";

/**
 * Seedance 2.0 (BytePlus ModelArk) — primary video provider per ai-pipeline.md.
 * Async content-generation tasks API: create task → poll task.
 */
export const seedanceProvider: VideoProvider = {
  id: "seedance",
  label: "Seedance 2.0",
  available: () => Boolean(process.env.SEEDANCE_API_KEY),
  async startClip(prompt: string, opts: VideoGenOptions = {}) {
    const base = process.env.SEEDANCE_API_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3";
    const content: Record<string, unknown>[] = [
      {
        type: "text",
        text: `${prompt} --ratio ${opts.aspectRatio ?? "9:16"} --duration ${Math.min(
          Math.max(Math.round(opts.durationSeconds ?? 5), 2),
          12,
        )}`,
      },
    ];
    if (opts.referenceImageUrl) {
      content.push({ type: "image_url", image_url: { url: opts.referenceImageUrl } });
    }
    const res = await fetch(`${base}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.SEEDANCE_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.SEEDANCE_MODEL ?? "seedance-2-0",
        content,
      }),
    });
    if (!res.ok) throw new Error(`Seedance ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { id: string };
    return { providerJobId: data.id };
  },
  async pollClip(providerJobId: string): Promise<VideoJobState> {
    const base = process.env.SEEDANCE_API_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3";
    const res = await fetch(`${base}/contents/generations/tasks/${providerJobId}`, {
      headers: { authorization: `Bearer ${process.env.SEEDANCE_API_KEY}` },
    });
    if (!res.ok) return { state: "failed", error: `Seedance poll ${res.status}` };
    const data = (await res.json()) as {
      status: string;
      content?: { video_url?: string };
      error?: { message?: string };
    };
    switch (data.status) {
      case "succeeded":
        return data.content?.video_url
          ? { state: "succeeded", url: data.content.video_url }
          : { state: "failed", error: "Seedance succeeded without a video URL" };
      case "failed":
      case "cancelled":
        return { state: "failed", error: data.error?.message ?? `Seedance ${data.status}` };
      default:
        return { state: "running", progress: data.status === "running" ? 50 : 10 };
    }
  },
};

/** Veo (Google) — swap-in alternative. */
export const veoProvider: VideoProvider = {
  id: "veo",
  label: "Veo",
  available: () => Boolean(process.env.VEO_API_KEY),
  async startClip(prompt, opts = {}) {
    const model = process.env.VEO_MODEL ?? "veo-3.0-generate-001";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${process.env.VEO_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { aspectRatio: opts.aspectRatio ?? "9:16" },
        }),
      },
    );
    if (!res.ok) throw new Error(`Veo ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { name: string };
    return { providerJobId: data.name };
  },
  async pollClip(providerJobId): Promise<VideoJobState> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${providerJobId}?key=${process.env.VEO_API_KEY}`,
    );
    if (!res.ok) return { state: "failed", error: `Veo poll ${res.status}` };
    const data = (await res.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: {
        generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[] };
      };
    };
    if (!data.done) return { state: "running", progress: 40 };
    if (data.error) return { state: "failed", error: data.error.message ?? "Veo failed" };
    const uri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    return uri
      ? { state: "succeeded", url: uri }
      : { state: "failed", error: "Veo finished without a video URI" };
  },
};

/** Kling — swap-in alternative. */
export const klingProvider: VideoProvider = {
  id: "kling",
  label: "Kling",
  available: () => Boolean(process.env.KLING_API_KEY),
  async startClip(prompt, opts = {}) {
    const res = await fetch("https://api.klingai.com/v1/videos/text2video", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.KLING_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model_name: process.env.KLING_MODEL ?? "kling-v2-master",
        prompt,
        aspect_ratio: opts.aspectRatio ?? "9:16",
        duration: String(Math.min(Math.max(Math.round(opts.durationSeconds ?? 5), 5), 10)),
      }),
    });
    if (!res.ok) throw new Error(`Kling ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { data: { task_id: string } };
    return { providerJobId: data.data.task_id };
  },
  async pollClip(providerJobId): Promise<VideoJobState> {
    const res = await fetch(`https://api.klingai.com/v1/videos/text2video/${providerJobId}`, {
      headers: { authorization: `Bearer ${process.env.KLING_API_KEY}` },
    });
    if (!res.ok) return { state: "failed", error: `Kling poll ${res.status}` };
    const data = (await res.json()) as {
      data: {
        task_status: string;
        task_status_msg?: string;
        task_result?: { videos?: { url: string; duration?: string }[] };
      };
    };
    const d = data.data;
    if (d.task_status === "succeed") {
      const video = d.task_result?.videos?.[0];
      return video
        ? {
            state: "succeeded",
            url: video.url,
            durationSeconds: video.duration ? parseFloat(video.duration) : undefined,
          }
        : { state: "failed", error: "Kling succeeded without a video" };
    }
    if (d.task_status === "failed") {
      return { state: "failed", error: d.task_status_msg ?? "Kling failed" };
    }
    return { state: "running", progress: d.task_status === "processing" ? 50 : 10 };
  },
};
