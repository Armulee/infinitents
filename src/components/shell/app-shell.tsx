"use client";

import { motion } from "framer-motion";
import { useWorkspace } from "@/lib/workspace-context";
import { useWorkspaceRealtime } from "@/hooks/use-realtime";
import { useUIStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { CommandPalette } from "./command-palette";
import { PipelinePulse } from "./pipeline-pulse";
import { LogoMark } from "./logo";

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <LogoMark className="size-10 animate-pulse-soft" />
        <p className="text-[13px] text-muted-foreground">Loading your content OS…</p>
      </motion.div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, workspace } = useWorkspace();
  const { sidebarCollapsed } = useUIStore();
  useWorkspaceRealtime();

  if (isLoading || !workspace) return <ShellSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <CommandPalette />
      <PipelinePulse />
      <main
        className={cn(
          "min-h-dvh pb-20 transition-[padding] duration-300 md:pb-0",
          sidebarCollapsed ? "md:pl-16" : "md:pl-[248px]",
        )}
      >
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
