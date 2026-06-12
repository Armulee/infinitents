-- ═══════════════════════════════════════════════════════════════════════════
-- Infinitents — initial schema
-- Multi-tenant: workspace → brands → projects → videos
-- Every resource belongs to a workspace. RLS on everything.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────

create type member_role as enum ('owner', 'admin', 'editor', 'viewer');

create type pipeline_stage as enum (
  'brand_extraction',
  'idea_generation',
  'script_generation',
  'audit',
  'storyboard',
  'image_generation',
  'prompt_packing',
  'video_generation',
  'editing',
  'publishing',
  'analytics_sync'
);

create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');

create type idea_status as enum ('new', 'shortlisted', 'in_production', 'rejected', 'archived');

create type script_status as enum ('draft', 'auditing', 'approved', 'rejected', 'revising');

create type audit_verdict as enum ('approved', 'needs_revision', 'rejected');

create type project_status as enum (
  'queued',            -- waiting for pipeline
  'scripting',
  'auditing',
  'storyboarding',
  'generating_assets', -- image references
  'generating_video',
  'editing',
  'ready_for_review',  -- lands in Content Queue
  'changes_requested',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'archived'
);

create type clip_status as enum ('pending', 'generating', 'ready', 'failed');

create type platform as enum ('tiktok', 'instagram', 'youtube', 'facebook');

create type connection_status as enum ('connected', 'expired', 'revoked', 'error');

create type publish_status as enum ('draft', 'scheduled', 'publishing', 'published', 'failed', 'canceled');

-- ── Profiles (mirror of auth.users) ─────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Workspaces & membership ──────────────────────────────────────────────────

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  daily_video_target int not null default 3 check (daily_video_target between 1 and 100),
  autopilot boolean not null default true,
  -- per-stage model preferences, e.g. {"idea_generation":"anthropic","image_generation":"flux"}
  model_preferences jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- Membership check used by every RLS policy. SECURITY DEFINER avoids
-- recursive RLS evaluation on workspace_members itself.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(ws uuid)
returns member_role
language sql
stable
security definer set search_path = public
as $$
  select m.role from public.workspace_members m
  where m.workspace_id = ws and m.user_id = auth.uid();
$$;

-- True when the current user shares at least one workspace with target_user.
-- SECURITY DEFINER so profile visibility doesn't recurse through RLS.
create or replace function public.shares_workspace_with(target_user uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them on them.workspace_id = me.workspace_id
    where me.user_id = auth.uid() and them.user_id = target_user
  );
$$;

-- ── Brands & Brand Brain ─────────────────────────────────────────────────────

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  website_url text,
  description text,
  logo_url text,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brands_workspace_idx on public.brands (workspace_id);

create table public.brand_knowledge (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  positioning text,
  audience text,
  personas jsonb not null default '[]'::jsonb,       -- [{name, age, occupation, goals, frustrations}]
  pain_points jsonb not null default '[]'::jsonb,    -- [string]
  offers jsonb not null default '[]'::jsonb,         -- [{name, description, price?}]
  usp text,
  brand_voice jsonb not null default '{}'::jsonb,    -- {tone, vocabulary[], avoid[], example}
  content_pillars jsonb not null default '[]'::jsonb,-- [{name, description, ratio}]
  learnings jsonb not null default '[]'::jsonb,      -- learning-loop insights [{insight, evidence, at}]
  raw jsonb not null default '{}'::jsonb,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brand_knowledge_brand_idx on public.brand_knowledge (brand_id);
create index brand_knowledge_workspace_idx on public.brand_knowledge (workspace_id);

-- ── Viral Lab ────────────────────────────────────────────────────────────────

create table public.generated_ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  title text not null,
  hook text not null,
  angle text not null,
  emotional_trigger text not null,
  viral_hypothesis text not null,
  content_pillar text,
  predicted_score numeric(4,1) not null default 0,   -- model-predicted virality 0–100
  status idea_status not null default 'new',
  source jsonb not null default '{}'::jsonb,         -- {trends[], learnings[], model}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index generated_ideas_workspace_idx on public.generated_ideas (workspace_id, status, created_at desc);
create index generated_ideas_brand_idx on public.generated_ideas (brand_id);

-- ── Scripts & Audit ──────────────────────────────────────────────────────────

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  idea_id uuid references public.generated_ideas (id) on delete set null,
  title text not null,
  hook text,
  voiceover text not null default '',
  scenes jsonb not null default '[]'::jsonb,  -- [{index, voiceover, visual_direction, b_roll[], duration_s}]
  cta text,
  duration_seconds int not null default 30,
  status script_status not null default 'draft',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scripts_workspace_idx on public.scripts (workspace_id, created_at desc);

create table public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  script_id uuid not null references public.scripts (id) on delete cascade,
  viral_score numeric(4,1) not null default 0,
  risk_score numeric(4,1) not null default 0,
  verdict audit_verdict not null,
  platform_safety jsonb not null default '{}'::jsonb,
  copyright_risk jsonb not null default '{}'::jsonb,
  clarity jsonb not null default '{}'::jsonb,
  brand_alignment jsonb not null default '{}'::jsonb,
  report jsonb not null default '{}'::jsonb,  -- {summary, strengths[], risks[], fixes[]}
  created_at timestamptz not null default now()
);

create index audit_reports_script_idx on public.audit_reports (script_id);
create index audit_reports_workspace_idx on public.audit_reports (workspace_id);

-- ── Storyboards & image references ───────────────────────────────────────────

create table public.storyboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  script_id uuid not null references public.scripts (id) on delete cascade,
  scenes jsonb not null default '[]'::jsonb,
  -- [{index, description, camera_direction, composition, transition_note, duration_s}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index storyboards_script_idx on public.storyboards (script_id);
create index storyboards_workspace_idx on public.storyboards (workspace_id);

create table public.image_references (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  storyboard_id uuid not null references public.storyboards (id) on delete cascade,
  scene_index int not null default 0,
  kind text not null check (kind in ('character', 'environment', 'mood', 'composition')),
  prompt text not null,
  provider text not null,
  storage_path text,
  url text,
  status clip_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index image_references_storyboard_idx on public.image_references (storyboard_id);
create index image_references_workspace_idx on public.image_references (workspace_id);

-- ── Video projects & generated clips ─────────────────────────────────────────

create table public.video_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  idea_id uuid references public.generated_ideas (id) on delete set null,
  script_id uuid references public.scripts (id) on delete set null,
  storyboard_id uuid references public.storyboards (id) on delete set null,
  title text not null,
  status project_status not null default 'queued',
  -- editor document: scenes, subtitles, audio, transitions (see src/lib/timeline.ts)
  timeline jsonb not null default '{}'::jsonb,
  prompt_pack jsonb not null default '{}'::jsonb,   -- output of prompt_packing stage
  final_video_url text,
  thumbnail_url text,
  duration_seconds int,
  aspect_ratio text not null default '9:16',
  review_note text,                                  -- "request changes" note from queue
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index video_projects_workspace_idx on public.video_projects (workspace_id, status, created_at desc);
create index video_projects_brand_idx on public.video_projects (brand_id);

create table public.generated_videos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.video_projects (id) on delete cascade,
  scene_index int not null default 0,
  prompt text not null,
  provider text not null,
  provider_job_id text,
  storage_path text,
  url text,
  thumbnail_url text,
  duration_seconds numeric(6,2),
  status clip_status not null default 'pending',
  attempt int not null default 1,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index generated_videos_project_idx on public.generated_videos (project_id, scene_index);
create index generated_videos_workspace_idx on public.generated_videos (workspace_id);

-- ── Publishing ───────────────────────────────────────────────────────────────

create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform platform not null,
  handle text not null,
  display_name text,
  avatar_url text,
  access_token text,        -- encrypt at rest via Supabase Vault in production
  refresh_token text,
  expires_at timestamptz,
  status connection_status not null default 'connected',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform, handle)
);

create index platform_connections_workspace_idx on public.platform_connections (workspace_id);

create table public.publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.video_projects (id) on delete cascade,
  connection_id uuid references public.platform_connections (id) on delete set null,
  platform platform not null,
  caption text,
  hashtags text[],
  scheduled_at timestamptz,
  published_at timestamptz,
  status publish_status not null default 'draft',
  external_id text,
  external_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index publishing_jobs_workspace_idx on public.publishing_jobs (workspace_id, status, scheduled_at);
create index publishing_jobs_project_idx on public.publishing_jobs (project_id);

-- ── Analytics ────────────────────────────────────────────────────────────────

create table public.analytics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.video_projects (id) on delete cascade,
  publishing_job_id uuid references public.publishing_jobs (id) on delete cascade,
  platform platform not null,
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  saves bigint not null default 0,
  watch_time_seconds bigint not null default 0,
  avg_watch_pct numeric(5,2) not null default 0,
  followers_delta int not null default 0,
  revenue_cents bigint not null default 0,
  raw jsonb not null default '{}'::jsonb,
  collected_at timestamptz not null default now()
);

create index analytics_workspace_idx on public.analytics (workspace_id, collected_at desc);
create index analytics_project_idx on public.analytics (project_id);

-- ── AI job queue ─────────────────────────────────────────────────────────────

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  stage pipeline_stage not null,
  status job_status not null default 'queued',
  priority int not null default 0,                  -- higher first
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  attempts int not null default 0,
  max_attempts int not null default 3,
  progress numeric(5,2) not null default 0,         -- 0–100, surfaced via Realtime
  progress_label text,
  brand_id uuid references public.brands (id) on delete cascade,
  idea_id uuid references public.generated_ideas (id) on delete cascade,
  script_id uuid references public.scripts (id) on delete cascade,
  project_id uuid references public.video_projects (id) on delete cascade,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_jobs_queue_idx on public.ai_jobs (status, scheduled_at, priority desc)
  where status in ('queued', 'running');
create index ai_jobs_workspace_idx on public.ai_jobs (workspace_id, created_at desc);
create index ai_jobs_project_idx on public.ai_jobs (project_id);

-- Atomically claim the next batch of runnable jobs (worker uses service role).
create or replace function public.claim_next_jobs(batch_size int default 5)
returns setof public.ai_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  update public.ai_jobs j
  set status = 'running',
      attempts = j.attempts + 1,
      started_at = now(),
      updated_at = now()
  where j.id in (
    select id from public.ai_jobs
    where status = 'queued' and scheduled_at <= now()
    order by priority desc, scheduled_at asc
    for update skip locked
    limit batch_size
  )
  returning j.*;
end;
$$;

-- Worker-only: PUBLIC holds implicit EXECUTE on new functions — revoke it too,
-- otherwise any authenticated user could claim (and read) cross-tenant jobs.
revoke execute on function public.claim_next_jobs(int) from public, anon, authenticated;

-- ── updated_at maintenance ───────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','workspaces','brands','brand_knowledge','generated_ideas','scripts',
    'storyboards','video_projects','generated_videos','platform_connections',
    'publishing_jobs','ai_jobs'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t
    );
  end loop;
end $$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.brands enable row level security;
alter table public.brand_knowledge enable row level security;
alter table public.generated_ideas enable row level security;
alter table public.scripts enable row level security;
alter table public.audit_reports enable row level security;
alter table public.storyboards enable row level security;
alter table public.image_references enable row level security;
alter table public.video_projects enable row level security;
alter table public.generated_videos enable row level security;
alter table public.platform_connections enable row level security;
alter table public.publishing_jobs enable row level security;
alter table public.analytics enable row level security;
alter table public.ai_jobs enable row level security;

-- profiles: self + workspace teammates (member lists need names/avatars)
create policy "profiles_select_self_or_peer" on public.profiles
  for select using (id = auth.uid() or public.shares_workspace_with(id));
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- workspaces (owner_id check lets INSERT … RETURNING work before the
-- bootstrap membership row exists)
create policy "workspaces_select_member" on public.workspaces
  for select using (owner_id = auth.uid() or public.is_workspace_member(id));
create policy "workspaces_insert_self_owner" on public.workspaces
  for insert with check (owner_id = auth.uid());
create policy "workspaces_update_admin" on public.workspaces
  for update using (public.workspace_role(id) in ('owner', 'admin'));
create policy "workspaces_delete_owner" on public.workspaces
  for delete using (public.workspace_role(id) = 'owner');

-- workspace_members
create policy "members_select_member" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "members_insert_owner_or_self_bootstrap" on public.workspace_members
  for insert with check (
    -- workspace owner bootstrapping their own membership…
    (user_id = auth.uid() and exists (
      select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()
    ))
    -- …or an admin inviting someone
    or public.workspace_role(workspace_id) in ('owner', 'admin')
  );
create policy "members_update_admin" on public.workspace_members
  for update using (public.workspace_role(workspace_id) in ('owner', 'admin'));
create policy "members_delete_admin_or_self" on public.workspace_members
  for delete using (
    user_id = auth.uid() or public.workspace_role(workspace_id) in ('owner', 'admin')
  );

-- Generic per-table workspace policies (member read, editor+ write)
do $$
declare t text;
begin
  foreach t in array array[
    'brands','brand_knowledge','generated_ideas','scripts','audit_reports',
    'storyboards','image_references','video_projects','generated_videos',
    'platform_connections','publishing_jobs','analytics','ai_jobs'
  ] loop
    execute format($p$
      create policy "%1$s_select_member" on public.%1$I
        for select using (public.is_workspace_member(workspace_id));
    $p$, t);
    execute format($p$
      create policy "%1$s_insert_editor" on public.%1$I
        for insert with check (public.workspace_role(workspace_id) in ('owner','admin','editor'));
    $p$, t);
    execute format($p$
      create policy "%1$s_update_editor" on public.%1$I
        for update using (public.workspace_role(workspace_id) in ('owner','admin','editor'));
    $p$, t);
    execute format($p$
      create policy "%1$s_delete_admin" on public.%1$I
        for delete using (public.workspace_role(workspace_id) in ('owner','admin'));
    $p$, t);
  end loop;
end $$;

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Progress, publishing status, rendering status, analytics updates.

alter publication supabase_realtime add table public.ai_jobs;
alter publication supabase_realtime add table public.video_projects;
alter publication supabase_realtime add table public.generated_videos;
alter publication supabase_realtime add table public.publishing_jobs;
alter publication supabase_realtime add table public.generated_ideas;
alter publication supabase_realtime add table public.analytics;

-- ── Storage buckets ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('brand-assets', 'brand-assets', true),
  ('image-references', 'image-references', true),
  ('video-clips', 'video-clips', true),
  ('renders', 'renders', true)
on conflict (id) do nothing;

create policy "storage_read_public" on storage.objects
  for select using (bucket_id in ('brand-assets','image-references','video-clips','renders'));

create policy "storage_write_authenticated" on storage.objects
  for insert with check (
    auth.role() = 'authenticated'
    and bucket_id in ('brand-assets','image-references','video-clips','renders')
  );
