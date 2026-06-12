"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";

/** table → query keys that go stale when it changes */
const INVALIDATIONS: Record<string, string[]> = {
  ai_jobs: ["jobs"],
  video_projects: ["projects", "project", "project-bundle"],
  generated_videos: ["project-bundle"],
  publishing_jobs: ["publishing", "projects"],
  generated_ideas: ["ideas"],
  analytics: ["analytics"],
};

/**
 * Supabase Realtime — generation progress, publishing status, rendering
 * status and analytics updates stream straight into the UI.
 */
export function useWorkspaceRealtime() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspace?.id) return;
    const supabase = supabaseBrowser();

    const channel = supabase.channel(`workspace:${workspace.id}`);
    for (const table of Object.keys(INVALIDATIONS)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `workspace_id=eq.${workspace.id}` },
        () => {
          for (const key of INVALIDATIONS[table]) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        },
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, queryClient]);
}
