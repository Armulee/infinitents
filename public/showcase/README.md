# Showcase clips

The landing-page hero/showcase plays these vertical clips **locally** from this
folder (`/showcase/<id>.mp4`). They're served same-origin so they always play —
Higgsfield's CDN blocks cross-domain `<video>` embedding, which is why we don't
load them from the CDN directly.

## How the files get here

Run:

```bash
npm run fetch:showcase
```

This downloads each clip listed in
`src/components/landing/showcase-data.ts` from its `remote` CDN URL into
`public/showcase/<id>.mp4`. A direct download has no `Referer`, so it isn't
affected by the embedding block.

It also runs automatically before every build (`prebuild`), so a fresh deploy
self-populates. The script is best-effort: any clip it can't fetch is skipped
and the gradient poster shows instead — it never fails the build.

To refresh a clip, delete its `<id>.mp4` and re-run the command (existing files
are skipped).

### If the download returns 403

Some CDN links expire or require auth. In that case, open each clip in the
Higgsfield app, download the MP4, and save it here as `<id>.mp4` using the
ids in the table below. Once the file exists the tile plays it automatically.

## Expected files

| id | tile |
| --- | --- |
| `c5eec055.mp4` | Chills reaction |
| `1c1dbfa2.mp4` | Night scroll |
| `276dd1e4.mp4` | Blue-glow close-up |
| `330e1086.mp4` | Late-night text |
| `ad06029e.mp4` | Tablet glow |
| `9be3677c.mp4` | App showcase |
| `1bcd1aa8.mp4` | Cosmic home |

To swap in different clips, edit `SHOWCASE` in
`src/components/landing/showcase-data.ts` (id, `remote` URL, poster gradient,
label, caption) and re-run `npm run fetch:showcase`.
