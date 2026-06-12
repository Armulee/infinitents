"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";
import type {
  AiJob,
  AnalyticsRow,
  AuditReport,
  BrandKnowledge,
  GeneratedIdea,
  GeneratedVideo,
  ImageReference,
  PipelineStage,
  PlatformConnection,
  PublishingJob,
  Script,
  Storyboard,
  VideoProject,
  Workspace,
  WorkspaceMember,
} from "@/lib/types";
import type { ReviewAction } from "@/stores/queue";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export function useIdeas(status?: GeneratedIdea["status"][]) {
  const { workspace } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["ideas", workspace?.id, status?.join(",") ?? "all"],
    enabled: Boolean(workspace?.id),
    queryFn: async () => {
      let q = supabase
        .from("generated_ideas")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("predicted_score", { ascending: false })
        .limit(200);
      if (status?.length) q = q.in("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GeneratedIdea[];
    },
  });
}

export function useProjects(statuses?: VideoProject["status"][]) {
  const { workspace } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["projects", workspace?.id, statuses?.join(",") ?? "all"],
    enabled: Boolean(workspace?.id),
    queryFn: async () => {
      let q = supabase
        .from("video_projects")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (statuses?.length) q = q.in("status", statuses);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VideoProject[];
    },
  });
}

export function useProject(id: string | null) {
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["project", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("video_projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as VideoProject;
    },
  });
}

/** Everything attached to a project for the detail drawer / studio. */
export function useProjectBundle(id: string | null) {
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["project-bundle", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from("video_projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const proj = project as VideoProject;
      const [script, storyboard, clips, idea, audits, refs] = await Promise.all([
        proj.script_id
          ? supabase.from("scripts").select("*").eq("id", proj.script_id).single()
          : Promise.resolve({ data: null }),
        proj.storyboard_id
          ? supabase.from("storyboards").select("*").eq("id", proj.storyboard_id).single()
          : Promise.resolve({ data: null }),
        supabase.from("generated_videos").select("*").eq("project_id", proj.id).order("scene_index"),
        proj.idea_id
          ? supabase.from("generated_ideas").select("*").eq("id", proj.idea_id).single()
          : Promise.resolve({ data: null }),
        proj.script_id
          ? supabase
              .from("audit_reports")
              .select("*")
              .eq("script_id", proj.script_id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        proj.storyboard_id
          ? supabase
              .from("image_references")
              .select("*")
              .eq("storyboard_id", proj.storyboard_id)
              .order("created_at")
          : Promise.resolve({ data: [] }),
      ]);
      return {
        project: proj,
        script: (script.data as Script | null) ?? null,
        storyboard: (storyboard.data as Storyboard | null) ?? null,
        clips: ((clips.data ?? []) as GeneratedVideo[]),
        idea: (idea.data as GeneratedIdea | null) ?? null,
        audits: ((audits.data ?? []) as AuditReport[]),
        references: ((refs.data ?? []) as ImageReference[]),
      };
    },
  });
}

export function useBrandKnowledge() {
  const { brand } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["knowledge", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_knowledge")
        .select("*")
        .eq("brand_id", brand!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as BrandKnowledge | null) ?? null;
    },
  });
}

export function useAiJobs(opts?: { activeOnly?: boolean; limit?: number }) {
  const { workspace } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["jobs", workspace?.id, opts?.activeOnly ?? false],
    enabled: Boolean(workspace?.id),
    refetchInterval: opts?.activeOnly ? 5_000 : false,
    queryFn: async () => {
      let q = supabase
        .from("ai_jobs")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("created_at", { ascending: false })
        .limit(opts?.limit ?? 60);
      if (opts?.activeOnly) q = q.in("status", ["queued", "running"]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AiJob[];
    },
  });
}

export function usePublishingJobs() {
  const { workspace } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["publishing", workspace?.id],
    enabled: Boolean(workspace?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publishing_jobs")
        .select("*, project:video_projects(id, title, thumbnail_url)")
        .eq("workspace_id", workspace!.id)
        .order("scheduled_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as PublishingJob[];
    },
  });
}

export function useConnections() {
  const { workspace } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["connections", workspace?.id],
    enabled: Boolean(workspace?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_connections")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as PlatformConnection[];
    },
  });
}

export function useAnalytics(days = 30) {
  const { workspace } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["analytics", workspace?.id, days],
    enabled: Boolean(workspace?.id),
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("analytics")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .gte("collected_at", since)
        .order("collected_at");
      if (error) throw error;
      return (data ?? []) as AnalyticsRow[];
    },
  });
}

export function useMembers() {
  const { workspace } = useWorkspace();
  const supabase = supabaseBrowser();
  return useQuery({
    queryKey: ["members", workspace?.id],
    enabled: Boolean(workspace?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*, profile:profiles(*)")
        .eq("workspace_id", workspace!.id);
      if (error) throw error;
      return (data ?? []) as WorkspaceMember[];
    },
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useReviewProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; action: ReviewAction; note?: string }) =>
      jsonFetch<{ ok: boolean; status: string }>(`/api/projects/${input.id}/review`, {
        method: "POST",
        body: JSON.stringify({ action: input.action, note: input.note }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["publishing"] });
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useProduceIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ideaId: string) =>
      jsonFetch<{ ok: boolean; project_id: string }>(`/api/ideas/${ideaId}/produce`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ideas"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Sent to the Content Factory", {
        description: "Script → audit → storyboard → video. You'll review it in the queue.",
      });
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useEnqueueStage() {
  const qc = useQueryClient();
  const { workspace, brand } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      stage: PipelineStage;
      payload?: Record<string, unknown>;
      project_id?: string;
    }) =>
      jsonFetch<{ ok: boolean; job_id: string }>(`/api/pipeline/enqueue`, {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspace!.id,
          brand_id: brand?.id,
          ...input,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  const supabase = supabaseBrowser();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Workspace> }) => {
      const { error } = await supabase.from("workspaces").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-bootstrap"] });
      toast.success("Workspace updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateKnowledge() {
  const qc = useQueryClient();
  const supabase = supabaseBrowser();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<BrandKnowledge> }) => {
      const { error } = await supabase.from("brand_knowledge").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Brand Brain updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSaveTimeline() {
  const qc = useQueryClient();
  const supabase = supabaseBrowser();
  return useMutation({
    mutationFn: async (input: { id: string; timeline: unknown; duration?: number }) => {
      const { error } = await supabase
        .from("video_projects")
        .update({
          timeline: input.timeline,
          ...(input.duration ? { duration_seconds: Math.round(input.duration) } : {}),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project", vars.id] });
      qc.invalidateQueries({ queryKey: ["project-bundle", vars.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAiEdit(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instruction: string) =>
      jsonFetch<{ ok: boolean; summary: string; regenerated: number[]; timeline: unknown }>(
        `/api/projects/${projectId}/ai-edit`,
        { method: "POST", body: JSON.stringify({ instruction }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-bundle", projectId] });
    },
  });
}

export function usePublishProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      connection_ids: string[];
      caption?: string;
      hashtags?: string[];
      scheduled_at?: string;
    }) =>
      jsonFetch<{ ok: boolean; publishing_job_ids: string[]; immediate: boolean }>(`/api/publish`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["publishing"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(data.immediate ? "Publishing now" : "Scheduled");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateIdeaStatus() {
  const qc = useQueryClient();
  const supabase = supabaseBrowser();
  return useMutation({
    mutationFn: async (input: { id: string; status: GeneratedIdea["status"] }) => {
      const { error } = await supabase
        .from("generated_ideas")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ideas"] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Sandbox platform connection (until OAuth apps are configured). */
export function useConnectPlatform() {
  const qc = useQueryClient();
  const supabase = supabaseBrowser();
  const { workspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { platform: PlatformConnection["platform"]; handle: string }) => {
      const { error } = await supabase.from("platform_connections").insert({
        workspace_id: workspace!.id,
        platform: input.platform,
        handle: input.handle.startsWith("@") ? input.handle : `@${input.handle}`,
        display_name: input.handle.replace(/^@/, ""),
        status: "connected",
        metadata: { sandbox: true },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Platform connected", { description: "Sandbox mode — swap in OAuth in Settings when ready." });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDisconnectPlatform() {
  const qc = useQueryClient();
  const supabase = supabaseBrowser();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
    onError: (err: Error) => toast.error(err.message),
  });
}
