/**
 * Downloads the landing-page showcase clips from Higgsfield's CDN into
 * `public/showcase/<id>.mp4` so the site can serve them locally.
 *
 * Why: the CDN blocks cross-domain <video> embedding (hotlink protection), so
 * the clips won't play when the deployed site tries to load them directly. A
 * plain server-side GET like this one has no Referer header, so it downloads
 * fine — and once the file lives in /public it's served same-origin.
 *
 * Run manually with `npm run fetch:showcase`. Also runs automatically before
 * `npm run build` (see the `prebuild` script) so deploys self-populate. It is
 * best-effort: any clip it can't fetch is skipped, never failing the build —
 * the gradient poster covers the gap.
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SHOWCASE } from "../src/components/landing/showcase-data";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/showcase");

async function exists(path: string) {
  try {
    const s = await stat(path);
    return s.size > 0;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let saved = 0;
  let skipped = 0;

  for (const clip of SHOWCASE) {
    const out = resolve(outDir, `${clip.id}.mp4`);
    if (await exists(out)) {
      console.log(`• exists  ${clip.id}.mp4`);
      continue;
    }
    try {
      const res = await fetch(clip.remote, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`suspiciously small (${buf.length}B)`);
      await writeFile(out, buf);
      saved++;
      console.log(`✓ saved   ${clip.id}.mp4  (${(buf.length / 1e6).toFixed(1)} MB)`);
    } catch (err) {
      skipped++;
      console.warn(`✗ skipped ${clip.id}.mp4 — ${(err as Error).message}`);
    }
  }

  console.log(`\nShowcase fetch done — ${saved} saved, ${skipped} skipped.`);
}

main().catch((err) => {
  // Never fail a build over showcase assets — posters cover the gap.
  console.warn("fetch-showcase: non-fatal error —", (err as Error).message);
});
