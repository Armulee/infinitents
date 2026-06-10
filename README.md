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
- **Cron** — `vercel.json` ships crons (`/api/jobs/process` every minute, `/api/jobs/schedule` daily). Off Vercel, schedule the Supabase Edge Function `pipeline-tick` (see `supabase/functions/pipeline-tick`).

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
scripts/
  seed.ts                        # demo workspace
  worker.ts                      # standalone queue worker
```

## Deployment

1. Push the repo to GitHub and import into Vercel (crons are picked up from `vercel.json`).
2. Set the env vars from `.env.example` in Vercel.
3. Apply the migration to your production Supabase project.
4. (Optional) `supabase functions deploy pipeline-tick` + schedule it if you're not on Vercel cron.

The primary success metric is built into the product: **videos approved and published.** Everything else is supporting cast.
