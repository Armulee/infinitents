
import type { ImageProvider } from "./types";

/** GPT Image (OpenAI Images API) — default per ai-pipeline.md */
export const gptImageProvider: ImageProvider = {
  id: "gpt-image",
  label: "GPT Image",
  available: () => Boolean(process.env.OPENAI_API_KEY),
  async generateImage(prompt, opts = {}) {
    const size =
      opts.aspectRatio === "16:9" ? "1536x1024" : opts.aspectRatio === "1:1" ? "1024x1024" : "1024x1536";
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        prompt: opts.style ? `${prompt}\n\nStyle: ${opts.style}` : prompt,
        size,
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`GPT Image ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { data: { url?: string; b64_json?: string }[] };
    const item = data.data[0];
    const url = item.url ?? (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
    if (!url) throw new Error("GPT Image returned no image");
    return { url, provider: "gpt-image" };
  },
};

/** Flux (Black Forest Labs) */
export const fluxProvider: ImageProvider = {
  id: "flux",
  label: "Flux",
  available: () => Boolean(process.env.BFL_API_KEY),
  async generateImage(prompt, opts = {}) {
    const [w, h] =
      opts.aspectRatio === "16:9" ? [1344, 768] : opts.aspectRatio === "1:1" ? [1024, 1024] : [768, 1344];
    const start = await fetch("https://api.bfl.ml/v1/flux-pro-1.1", {
      method: "POST",
      headers: { "x-key": process.env.BFL_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({ prompt, width: w, height: h }),
    });
    if (!start.ok) throw new Error(`Flux ${start.status}: ${await start.text()}`);
    const { id } = (await start.json()) as { id: string };

    // Flux is async — poll for the result.
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(`https://api.bfl.ml/v1/get_result?id=${id}`, {
        headers: { "x-key": process.env.BFL_API_KEY! },
      });
      if (!poll.ok) continue;
      const data = (await poll.json()) as {
        status: string;
        result?: { sample?: string };
      };
      if (data.status === "Ready" && data.result?.sample) {
        return { url: data.result.sample, provider: "flux" };
      }
      if (data.status === "Error" || data.status === "Content Moderated") {
        throw new Error(`Flux generation ${data.status}`);
      }
    }
    throw new Error("Flux generation timed out");
  },
};
