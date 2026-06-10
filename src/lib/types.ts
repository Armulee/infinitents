// ─────────────────────────────────────────────────────────────────────────────
// Domain types — mirror of supabase/migrations/00001_init.sql
// In production, regenerate with `supabase gen types typescript` and diff.
// ─────────────────────────────────────────────────────────────────────────────

export type MemberRole = "owner" | "admin" | "editor" | "viewer";

export const PIPELINE_STAGES = [
  "brand_extraction",
  "idea_generation",
  "script_generation",
  "audit",
  "storyboard",
  "image_generation",
  "prompt_packing",
  "video_generation",
  "editing",
  "publishing",
  "analytics_sync",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type IdeaStatus = "new" | "shortlisted" | "in_production" | "rejected" | "archived";

export type ScriptStatus = "draft" | "auditing" | "approved" | "rejected" | "revising";

export type AuditVerdict = "approved" | "needs_revision" | "rejected";

export type ProjectStatus =
  | "queued"
  | "scripting"
  | "auditing"
  | "storyboarding"
  | "generating_assets"
  | "generating_video"
  | "editing"
  | "ready_for_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "archived";

export type ClipStatus = "pending" | "generating" | "ready" | "failed";

export type Platform = "tiktok" | "instagram" | "youtube" | "facebook";

export type ConnectionStatus = "connected" | "expired" | "revoked" | "error";

export type PublishStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "canceled";

// ── Rows ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  daily_video_target: number;
  autopilot: boolean;
  model_preferences: Partial<Record<PipelineStage, string>>;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  profile?: Profile;
}

export interface Brand {
  id: string;
  workspace_id: string;
  name: string;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

export interface Persona {
  name: string;
  age: string;
  occupation: string;
  goals: string[];
  frustrations: string[];
}

export interface Offer {
  name: string;
  description: string;
  price?: string;
}

export interface BrandVoice {
  tone: string;
  vocabulary: string[];
  avoid: string[];
  example: string;
}

export interface ContentPillar {
  name: string;
  description: string;
  ratio: number; // 0–100 share of content
}

export interface Learning {
  insight: string;
  evidence: string;
  at: string;
}

export interface BrandKnowledge {
  id: string;
  workspace_id: string;
  brand_id: string;
  positioning: string | null;
  audience: string | null;
  personas: Persona[];
  pain_points: string[];
  offers: Offer[];
  usp: string | null;
  brand_voice: Partial<BrandVoice>;
  content_pillars: ContentPillar[];
  learnings: Learning[];
  raw: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedIdea {
  id: string;
  workspace_id: string;
  brand_id: string;
  title: string;
  hook: string;
  angle: string;
  emotional_trigger: string;
  viral_hypothesis: string;
  content_pillar: string | null;
  predicted_score: number;
  status: IdeaStatus;
  source: { trends?: string[]; learnings?: string[]; model?: string };
  created_at: string;
  updated_at: string;
}

export interface ScriptScene {
  index: number;
  voiceover: string;
  visual_direction: string;
  b_roll: string[];
  duration_s: number;
}

export interface Script {
  id: string;
  workspace_id: string;
  brand_id: string;
  idea_id: string | null;
  title: string;
  hook: string | null;
  voiceover: string;
  scenes: ScriptScene[];
  cta: string | null;
  duration_seconds: number;
  status: ScriptStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AuditDimension {
  score: number; // 0–100
  notes: string;
}

export interface AuditReport {
  id: string;
  workspace_id: string;
  script_id: string;
  viral_score: number;
  risk_score: number;
  verdict: AuditVerdict;
  platform_safety: Partial<AuditDimension>;
  copyright_risk: Partial<AuditDimension>;
  clarity: Partial<AuditDimension>;
  brand_alignment: Partial<AuditDimension>;
  report: { summary?: string; strengths?: string[]; risks?: string[]; fixes?: string[] };
  created_at: string;
}

export interface StoryboardScene {
  index: number;
  description: string;
  camera_direction: string;
  composition: string;
  transition_note: string;
  duration_s: number;
}

export interface Storyboard {
  id: string;
  workspace_id: string;
  script_id: string;
  scenes: StoryboardScene[];
  created_at: string;
  updated_at: string;
}

export type ImageRefKind = "character" | "environment" | "mood" | "composition";

export interface ImageReference {
  id: string;
  workspace_id: string;
  storyboard_id: string;
  scene_index: number;
  kind: ImageRefKind;
  prompt: string;
  provider: string;
  storage_path: string | null;
  url: string | null;
  status: ClipStatus;
  created_at: string;
}

export interface PromptPack {
  scene_count?: number;
  parallel_jobs?: number;
  prompts?: { scene_index: number; prompt: string; duration_s: number }[];
  notes?: string;
}

export interface VideoProject {
  id: string;
  workspace_id: string;
  brand_id: string;
  idea_id: string | null;
  script_id: string | null;
  storyboard_id: string | null;
  title: string;
  status: ProjectStatus;
  timeline: TimelineDoc | Record<string, never>;
  prompt_pack: PromptPack;
  final_video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  aspect_ratio: string;
  review_note: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedVideo {
  id: string;
  workspace_id: string;
  project_id: string;
  scene_index: number;
  prompt: string;
  provider: string;
  provider_job_id: string | null;
  storage_path: string | null;
  url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: ClipStatus;
  attempt: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformConnection {
  id: string;
  workspace_id: string;
  platform: Platform;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  status: ConnectionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PublishingJob {
  id: string;
  workspace_id: string;
  project_id: string;
  connection_id: string | null;
  platform: Platform;
  caption: string | null;
  hashtags: string[] | null;
  scheduled_at: string | null;
  published_at: string | null;
  status: PublishStatus;
  external_id: string | null;
  external_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  project?: Pick<VideoProject, "id" | "title" | "thumbnail_url">;
}

export interface AnalyticsRow {
  id: string;
  workspace_id: string;
  project_id: string | null;
  publishing_job_id: string | null;
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watch_time_seconds: number;
  avg_watch_pct: number;
  followers_delta: number;
  revenue_cents: number;
  raw: Record<string, unknown>;
  collected_at: string;
}

export interface AiJob {
  id: string;
  workspace_id: string;
  stage: PipelineStage;
  status: JobStatus;
  priority: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  progress: number;
  progress_label: string | null;
  brand_id: string | null;
  idea_id: string | null;
  script_id: string | null;
  project_id: string | null;
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Editor timeline document (video_projects.timeline) ───────────────────────

export interface TimelineScene {
  id: string;
  index: number;
  clip_url: string | null;
  thumbnail_url: string | null;
  /** seconds into the source clip */
  trim_start: number;
  /** scene duration in seconds */
  duration: number;
  transition: "cut" | "fade" | "slide" | "zoom" | "whip";
  voiceover: string;
  visual_direction?: string;
}

export interface Subtitle {
  id: string;
  start: number;
  end: number;
  text: string;
  emphasis?: boolean;
}

export interface AudioSettings {
  music_track: string | null;
  music_volume: number; // 0–1
  voiceover_volume: number; // 0–1
  voice: "female_warm" | "female_energetic" | "male_warm" | "male_deep" | "narrator";
  ducking: boolean;
}

export interface TimelineDoc {
  version: number;
  scenes: TimelineScene[];
  subtitles: Subtitle[];
  audio: AudioSettings;
  caption_style: {
    font: string;
    size: "sm" | "md" | "lg";
    position: "bottom" | "center" | "top";
    style: "clean" | "bold" | "karaoke" | "outline";
  };
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export const STAGE_LABELS: Record<PipelineStage, string> = {
  brand_extraction: "Brand Extraction",
  idea_generation: "Idea Generation",
  script_generation: "Script Writing",
  audit: "Audit",
  storyboard: "Storyboard",
  image_generation: "Image References",
  prompt_packing: "Prompt Packing",
  video_generation: "Video Generation",
  editing: "Editing",
  publishing: "Publishing",
  analytics_sync: "Analytics Sync",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  queued: "Queued",
  scripting: "Writing script",
  auditing: "Auditing",
  storyboarding: "Storyboarding",
  generating_assets: "Creating references",
  generating_video: "Generating video",
  editing: "Editing",
  ready_for_review: "Ready for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Needs attention",
  archived: "Archived",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  youtube: "YouTube Shorts",
  facebook: "Facebook Reels",
};
