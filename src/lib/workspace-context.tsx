"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Brand, Profile, Workspace } from "@/lib/types";

interface WorkspaceContextValue {
  user: User | null;
  profile: Profile | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  brand: Brand | null;
  brands: Brand[];
  isLoading: boolean;
  switchWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const ACTIVE_WS_KEY = "infinitents-active-workspace";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(localStorage.getItem(ACTIVE_WS_KEY));
  }, []);

  const { data: auth, isLoading: authLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 60_000,
  });

  const { data: bootstrap, isLoading: bootLoading } = useQuery({
    queryKey: ["workspace-bootstrap", auth?.id],
    enabled: Boolean(auth?.id),
    queryFn: async () => {
      const [{ data: profile }, { data: workspaces }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", auth!.id).maybeSingle(),
        supabase.from("workspaces").select("*").order("created_at"),
      ]);
      return {
        profile: (profile as Profile | null) ?? null,
        workspaces: ((workspaces ?? []) as Workspace[]),
      };
    },
  });

  const workspaces = useMemo(() => bootstrap?.workspaces ?? [], [bootstrap?.workspaces]);
  const workspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? workspaces[0] ?? null,
    [workspaces, activeId],
  );

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ["brands", workspace?.id],
    enabled: Boolean(workspace?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("brands")
        .select("*")
        .eq("workspace_id", workspace!.id)
        .order("created_at");
      return (data ?? []) as Brand[];
    },
  });

  const isLoading = authLoading || bootLoading || (Boolean(workspace) && brandsLoading);

  // Authenticated but workspace-less → onboarding.
  useEffect(() => {
    if (!authLoading && !bootLoading && auth && workspaces.length === 0) {
      router.replace("/onboarding");
    }
  }, [authLoading, bootLoading, auth, workspaces.length, router]);

  const switchWorkspace = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_WS_KEY, id);
    setActiveId(id);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      user: auth ?? null,
      profile: bootstrap?.profile ?? null,
      workspace,
      workspaces,
      brand: brands?.[0] ?? null,
      brands: brands ?? [],
      isLoading,
      switchWorkspace,
    }),
    [auth, bootstrap?.profile, workspace, workspaces, brands, isLoading, switchWorkspace],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
