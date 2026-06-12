
import { extractJSON, type TextGenOptions, type TextProvider } from "./types";

/** Claude — strongest available reasoning model (default for extraction/audit). */
export const anthropicProvider: TextProvider = {
  id: "anthropic",
  label: "Claude",
  available: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async generateText(prompt, opts = {}) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.7,
        system: opts.system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.find((b) => b.type === "text")?.text ?? "";
  },
  async generateJSON<T>(prompt: string, opts?: TextGenOptions) {
    const text = await this.generateText(
      `${prompt}\n\nRespond with valid JSON only. No prose before or after.`,
      opts,
    );
    return extractJSON<T>(text);
  },
};

/** GPT */
export const openaiProvider: TextProvider = {
  id: "openai",
  label: "GPT",
  available: () => Boolean(process.env.OPENAI_API_KEY),
  async generateText(prompt, opts = {}) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.7,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  },
  async generateJSON<T>(prompt: string, opts?: TextGenOptions) {
    const text = await this.generateText(
      `${prompt}\n\nRespond with valid JSON only. No prose before or after.`,
      opts,
    );
    return extractJSON<T>(text);
  },
};

/** Gemini */
export const googleProvider: TextProvider = {
  id: "google",
  label: "Gemini",
  available: () => Boolean(process.env.GOOGLE_AI_API_KEY),
  async generateText(prompt, opts = {}) {
    const model = process.env.GOOGLE_AI_MODEL ?? "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(opts.system
            ? { systemInstruction: { parts: [{ text: opts.system }] } }
            : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.7,
            maxOutputTokens: opts.maxTokens ?? 4096,
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  },
  async generateJSON<T>(prompt: string, opts?: TextGenOptions) {
    const text = await this.generateText(
      `${prompt}\n\nRespond with valid JSON only. No prose before or after.`,
      opts,
    );
    return extractJSON<T>(text);
  },
};
