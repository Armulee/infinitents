"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useUIStore } from "@/stores/ui";
import { useEnqueueStage } from "@/hooks/use-queries";
import { useWorkspace } from "@/lib/workspace-context";
import { NAV_ITEMS } from "./nav-items";

export function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUIStore();
  const { setTheme, resolvedTheme } = useTheme();
  const { brand, workspace } = useWorkspace();
  const enqueue = useEnqueueStage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandOpen, setCommandOpen]);

  const run = useCallback(
    (fn: () => void) => {
      setCommandOpen(false);
      fn();
    },
    [setCommandOpen],
  );

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
              <item.icon />
              {item.label}
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            disabled={!brand || !workspace}
            onSelect={() =>
              run(() => {
                enqueue.mutate({
                  stage: "idea_generation",
                  payload: { brand_id: brand!.id, count: (workspace?.daily_video_target ?? 3) * 2 },
                });
                router.push("/viral-lab");
              })
            }
          >
            <Zap />
            Generate fresh ideas
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            Toggle theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
