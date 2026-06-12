# Infinitents

**The Operating System for Content Growth.**

Infinitents is an AI-powered Content OS: it researches, plans, generates, edits, optimizes, publishes and learns from short-form content — automatically. You don't manage AI. You manage outcomes. Set a daily video target, review the queue, approve with one swipe. Everything else is the machine's job.

> Product, design, architecture and pipeline specs live in [`product.md`](./product.md), [`design.md`](./design.md), [`architecture.md`](./architecture.md) and [`ai-pipeline.md`](./ai-pipeline.md). This codebase implements them.

---

## The loop

```
Brand Knowledge → Viral Ideas → Scripts → Audit → Storyboards → Image Refs
      ↑                                                              ↓
   Learning ← Analytics ← Publishing ← Approval ← Editing ← Video Generation
```

Every arrow is a queue-based pipeline stage (`ai_jobs` table, claimed with `FOR UPDATE SKIP LOCKED`). Only approved scripts continue. Only approved videos publish. Performance data feeds back into the Brand Brain, so the idea engine gets sharper every day.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js App Router · TypeScript · TailwindCSS v4 · shadcn/ui · Framer Motion |
| Backend | Supabase (PostgreSQL · Auth · Storage · Realtime · Edge Functions) |
| State | Zustand · React Query |
| AI | Provider abstraction — Claude / GPT / Gemini (text), GPT Image / Flux (image), Seedance 2.0 / Veo / Kling (video) |

## Getting started

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then apply the schema:

```bash
# with the Supabase CLI linked to your project
supabase db push          # applies supabase/migrations/00001_init.sql
# or paste the migration into the SQL editor in the dashboard
```

This creates all tables (multi-tenant: workspace → brands → projects → videos), full RLS, the `claim_next_jobs` queue RPC, Realtime publications and storage buckets.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and a random `CRON_SECRET`.

**AI keys are optional.** Any stage without a configured provider falls back to a deterministic mock (with a loud console warning), so the entire pipeline — extraction to publish to analytics — runs end-to-end in development with zero keys. Add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SEEDANCE_API_KEY`, etc. to go live, and swap providers per-stage in **Settings → AI models** without touching business logic.

### 3. Run

```bash
npm install
npm run dev        # app on http://localhost:3000
```

The job queue drains three ways (all safe concurrently — claiming is `SKIP LOCKED`):

- **In-app pulse** — while the app is open, pending jobs are processed automatically (zero setup; this is all you need in dev).
- **Standalone worker** — `npm run worker` for a dedicated loop.
- **Cron** — the Cloudflare Worker in `workers/cron` fires on Cron Triggers (`/api/jobs/process` every minute, `/api/jobs/schedule` daily at 06:00 UTC) and works on the Workers **Free plan**. See [Production cron](#production-cron-cloudflare-workers). Alternatively, schedule the Supabase Edge Function `pipeline-tick` (see `supabase/functions/pipeline-tick`).

### 4. Demo data (optional, recommended)

```bash
npm run seed
```

Creates **demo@infinitents.app / infinitents-demo** with the *Lumen* workspace: a full Brand Brain, six viral ideas, two videos waiting in the Content Queue (playable, with captions), one published video with three days of analytics, and the learning loop already primed.

## Product surface

| Page | What it is |
| --- | --- |
| **Dashboard** | Today's outcome vs. target, live pipeline, performance pulse |
| **Content Queue** | The heart of the product. TikTok × Linear: one video at a time, swipe right to approve, swipe left to request changes, double-tap to quick-approve. Keyboard: `A` approve · `R` changes · `X` reject · `G` regenerate · `E` edit |
| **Viral Lab** | Generated ideas with hook, angle, emotional trigger, viral hypothesis and predicted score. One click sends an idea through the whole factory |
| **Content Factory** | Live board of every video moving through the pipeline with realtime progress |
| **Brand Brain** | Extracted positioning, audience, personas, pain points, USP, voice, pillars — plus what the system has learned from performance |
| **Publishing Center** | TikTok / Instagram Reels / YouTube Shorts / Facebook Reels connections, scheduling and shipped posts |
| **Analytics** | Views, engagement, platform breakdown, top videos — feeds the learning loop |
| **Studio** (`/studio/[id]`) | CapCut-simple editor: scene timeline (drag to reorder), subtitle editor, audio controls, transitions, asset library and an **AI chat panel** that edits the project from natural language ("Make the intro stronger", "Shorten to 20 seconds") |

## Authentication

Supabase Auth is the single source of truth. Email + password and **Google OAuth** both resolve to the same `auth.users` row; sessions are cookie-based (`@supabase/ssr`, PKCE) and refreshed by the middleware on every request. Profiles are created by a database trigger and kept in sync when identities link.

**Enable "Continue with Google":**

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* (type: Web application).
   - Authorized JavaScript origins: `http://localhost:3000` and your production URL.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase Dashboard** → Authentication → Sign In / Providers → **Google**: enable it and paste the Client ID + Client Secret. (No app env vars needed.)
3. **Supabase Dashboard** → Authentication → URL Configuration:
   - *Site URL*: your production app URL.
   - *Redirect URLs*: add `http://localhost:3000/auth/callback` and `https://<your-app>/auth/callback`.
4. Apply `supabase/migrations/00002_oauth_profile_sync.sql` (`supabase db push`) so Google's `name`/`picture` metadata maps into profiles and identity-linking backfills them.

**Account linking — no duplicate accounts:** Supabase automatically links a Google sign-in to an existing user when the email matches and both are verified, so an email/password user who later clicks "Continue with Google" lands in the same account, workspaces intact. Keep **Confirm email** enabled (Authentication → Sign In / Providers → Email) so password accounts are always verified and linking can occur. The reverse direction is safe too: signing *up* with a password on an email that already has a Google identity is rejected by Supabase rather than duplicated.

**Email links (recommended):** point the email templates (Authentication → Emails) at the token-hash route so confirmation and reset links work even when opened in a different browser than the one that started the flow:

- *Confirm signup*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
- *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Flow map: `/auth/callback` exchanges PKCE codes (Google OAuth + same-browser email links) · `/auth/confirm` verifies token-hash email links · `/reset-password` sets a new password from a recovery session · "Forgot password?" lives on `/login`.

## Architecture notes

- **Multi-tenancy + RLS** — every row carries `workspace_id`; policies enforce member read / editor write / admin delete via `is_workspace_member()` and `workspace_role()` (SECURITY DEFINER to avoid recursive RLS).
- **Job system** — 11 stages (`brand_extraction` → `analytics_sync`) as a Postgres-backed queue. Stage handlers live in `src/server/pipeline/stages/`; the runner retries with exponential backoff and supports async stages that re-queue themselves (video generation polls providers this way). Scenes generate **in parallel** — one job per scene — with per-clip retries and partial regeneration.
- **Provider abstraction** — `src/server/providers/`: `TextProvider`, `ImageProvider`, `VideoProvider` interfaces with a registry that resolves per-workspace preferences → env availability → mock fallback. Models swap without changing business logic.
- **Realtime** — generation progress, publishing status, rendering status and analytics stream into the UI via Supabase Realtime (`useWorkspaceRealtime`).
- **Final render** — the review player stitches scene clips client-side, so the loop works with zero render infrastructure. Set `RENDER_SERVICE_URL` to plug in an MP4 assembly service (the `editing` stage POSTs the timeline document to it).
- **Publishing** — live platform calls when OAuth tokens exist; otherwise a sandbox publish keeps the loop intact and analytics simulate a believable growth curve so the learning loop runs with realistic data.

## Project layout

```
supabase/
  migrations/00001_init.sql      # schema, RLS, queue RPC, realtime, buckets
  functions/pipeline-tick/       # Edge Function cron driver
src/
  app/                           # routes (App Router)
    (app)/                       # dashboard, queue, viral-lab, factory,
                                 # brand-brain, publishing, analytics, settings
    studio/[projectId]/          # full-bleed video editor
    api/                         # jobs worker/scheduler, review, ai-edit, publish…
  components/                    # ui primitives, shell, queue, factory, studio…
  hooks/                         # React Query data layer + realtime
  lib/                           # types, supabase clients, timeline, motion
  server/
    providers/                   # AI provider abstraction (text/image/video + mock)
    pipeline/                    # prompts, stages, runner, scheduler, AI editor
workers/
  cron/                          # Cloudflare Worker — production cron (free plan)
scripts/
  seed.ts                        # demo workspace
  worker.ts                      # standalone queue worker
```

## Deployment

### 1. App (Vercel or any Node host)

1. Push the repo to GitHub and import into Vercel (the Hobby plan is fine — cron runs on Cloudflare, not Vercel).
2. Set the env vars from `.env.example` in the hosting dashboard. Note the `CRON_SECRET` value — the cron worker needs the same one.
3. Apply the migration to your production Supabase project.

### 2. Production cron (Cloudflare Workers)

Scheduling runs on **Cloudflare Workers Cron Triggers** — available on the Workers **Free plan** (the every-minute schedule is ~1,441 invocations/day against a 100,000/day limit). The worker is a thin trigger that calls the Next.js API endpoints, so all business logic stays in the app:

| Cron Trigger (UTC) | Calls | Purpose |
| --- | --- | --- |
| `* * * * *` | `POST {APP_URL}/api/jobs/process` | Drain the `ai_jobs` queue |
| `0 6 * * *` | `POST {APP_URL}/api/jobs/schedule` | Daily autopilot (ideas → production → publishes → analytics) |

Deploy it:

```bash
cd workers/cron
npm install
npx wrangler login                      # one-time Cloudflare auth
npx wrangler secret put CRON_SECRET     # paste the SAME value as the app's CRON_SECRET
npm run deploy -- --var APP_URL:https://your-app.vercel.app
```

(Or edit `APP_URL` in `workers/cron/wrangler.toml` and just `npm run deploy`.)

Verify:

```bash
npm run tail                            # live logs; expect "[cron:process] ok …" each minute
curl https://infinitents-cron.<your-subdomain>.workers.dev/health
# manual fire of either job:
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://infinitents-cron.<your-subdomain>.workers.dev/trigger?task=schedule"
```

Local development of the worker (`wrangler dev --test-scheduled` via `npm run dev`, with `.dev.vars` copied from `.dev.vars.example`):

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"   # simulates the every-minute trigger
```

Failed runs throw, so they show up as errors in the Cloudflare dashboard (Workers → infinitents-cron → Metrics) — point alerts there.

### 3. Optional

`supabase functions deploy pipeline-tick` + a Supabase schedule can substitute for the Cloudflare worker if you'd rather keep everything in Supabase.

The primary success metric is built into the product: **videos approved and published.** Everything else is supporting cast.
