"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronsUpDown, LogOut, PanelLeftClose, PanelLeftOpen, Plus, Search, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";
import { useUIStore } from "@/stores/ui";
import { useAiJobs, useProjects } from "@/hooks/use-queries";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { LogoMark } from "./logo";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, workspaces, profile, switchWorkspace } = useWorkspace();
  const { sidebarCollapsed, toggleSidebar, setCommandOpen } = useUIStore();
  const { data: activeJobs } = useAiJobs({ activeOnly: true });
  const { data: reviewReady } = useProjects(["ready_for_review"]);

  const collapsed = sidebarCollapsed;
  const initials = (profile?.full_name ?? profile?.email ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 248 }}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/70 bg-sidebar md:flex"
    >
      {/* Workspace switcher */}
      <div className={cn("flex h-14 items-center gap-2 px-3", collapsed && "justify-center px-0")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-secondary/70",
                !collapsed && "flex-1 min-w-0",
              )}
            >
              <LogoMark />
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold leading-tight">
                      {workspace?.name ?? "Workspace"}
                    </div>
                    <div className="text-[11px] leading-tight text-muted-foreground">
                      {workspace?.daily_video_target ?? 0} videos / day
                    </div>
                  </div>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => switchWorkspace(ws.id)}
                className={cn(ws.id === workspace?.id && "bg-secondary")}
              >
                <Sparkles />
                <span className="truncate">{ws.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/onboarding")}>
              <Plus />
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search / command */}
      <div className={cn("px-3 pb-2", collapsed && "px-2")}>
        <button
          onClick={() => setCommandOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <Search className="size-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <Kbd>⌘K</Kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge =
            item.href === "/queue"
              ? (reviewReady?.length ?? 0)
              : item.href === "/factory"
                ? (activeJobs?.length ?? 0)
                : 0;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-secondary"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <item.icon className={cn("relative z-10 size-[17px] shrink-0", active && "text-primary")} />
              {!collapsed && <span className="relative z-10 flex-1 truncate">{item.label}</span>}
              {!collapsed && badge > 0 && (
                <span
                  className={cn(
                    "relative z-10 rounded-md px-1.5 py-px text-[11px] font-semibold tnum",
                    item.href === "/queue" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {badge}
                </span>
              )}
              {collapsed && badge > 0 && (
                <span className="absolute right-1.5 top-1.5 z-10 size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                {item.label}
                {badge > 0 && <span className="text-primary tnum">{badge}</span>}
              </TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      {/* Active pipeline indicator */}
      <AnimatePresence>
        {(activeJobs?.length ?? 0) > 0 && !collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-3 mb-2 rounded-lg border border-primary/25 bg-primary/8 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-[12px] font-medium text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {activeJobs!.length} job{activeJobs!.length === 1 ? "" : "s"} running
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {activeJobs![0]?.progress_label ?? "Working on your content…"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User + collapse */}
      <div
        className={cn(
          "flex items-center gap-1 border-t border-border/70 p-3",
          collapsed && "flex-col px-2",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-secondary/70",
                !collapsed && "flex-1 min-w-0",
              )}
            >
              <Avatar className="size-7">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium leading-tight">
                    {profile?.full_name ?? "You"}
                  </div>
                  <div className="truncate text-[11px] leading-tight text-muted-foreground">
                    {profile?.email}
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} className="shrink-0 text-muted-foreground">
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
    </motion.aside>
  );
}
