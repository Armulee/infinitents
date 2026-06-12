"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Bot, Check, Image as ImageIcon, Loader2, MessageSquareText, Users, Video } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useMembers, useUpdateWorkspace } from "@/hooks/use-queries";
import { useWorkspace } from "@/lib/workspace-context";
import { STAGE_LABELS, type PipelineStage } from "@/lib/types";
import { fadeUp, staggerChildren } from "@/lib/motion";

interface ProviderOption {
  id: string;
  label: string;
  available: boolean;
}

interface ProviderOptions {
  text: ProviderOption[];
  image: ProviderOption[];
  video: ProviderOption[];
}

const MODEL_STAGES: { stage: PipelineStage; kind: keyof ProviderOptions; icon: React.ComponentType<{ className?: string }> }[] = [
  { stage: "brand_extraction", kind: "text", icon: MessageSquareText },
  { stage: "idea_generation", kind: "text", icon: MessageSquareText },
  { stage: "script_generation", kind: "text", icon: MessageSquareText },
  { stage: "audit", kind: "text", icon: MessageSquareText },
  { stage: "image_generation", kind: "image", icon: ImageIcon },
  { stage: "video_generation", kind: "video", icon: Video },
];

export default function SettingsPage() {
  const { workspace, profile } = useWorkspace();
  const update = useUpdateWorkspace();
  const { data: members } = useMembers();

  const [name, setName] = useState("");
  const [target, setTarget] = useState(3);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setTarget(workspace.daily_video_target);
    }
  }, [workspace]);

  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      if (!res.ok) throw new Error("Failed to load providers");
      return (await res.json()) as ProviderOptions;
    },
  });

  if (!workspace) return null;
  const dirty = name !== workspace.name || target !== workspace.daily_video_target;

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Outcomes, models and team — everything else is automatic." />

      <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="mt-6 space-y-4">
        {/* Outcomes */}
        <motion.div variants={fadeUp} custom={0}>
          <Card>
            <CardHeader>
              <CardTitle>Outcome</CardTitle>
              <CardDescription>The one promise the system keeps: give me X videos per day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ws-name">Workspace name</Label>
                  <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label>Videos per day</Label>
                    <span className="text-lg font-semibold text-primary tnum">{target}</span>
                  </div>
                  <Slider min={1} max={20} step={1} value={[target]} onValueChange={([v]) => setTarget(v)} className="pt-2" />
                  <p className="text-[11.5px] text-muted-foreground">
                    {target * 2} ideas generated daily · best {target} produced automatically
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <ToggleRow
                  title="Autopilot"
                  description="Generate ideas and start production daily without being asked"
                  checked={workspace.autopilot}
                  onChange={(autopilot) => update.mutate({ id: workspace.id, patch: { autopilot } })}
                />
                <ToggleRow
                  title="Auto-schedule on approve"
                  description="Approved videos schedule to all connected platforms"
                  checked={workspace.settings?.auto_schedule !== false}
                  onChange={(v) =>
                    update.mutate({
                      id: workspace.id,
                      patch: { settings: { ...workspace.settings, auto_schedule: v } },
                    })
                  }
                />
              </div>

              {dirty && (
                <Button
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate({ id: workspace.id, patch: { name, daily_video_target: target } })
                  }
                >
                  {update.isPending ? <Loader2 className="animate-spin" /> : <Check />}
                  Save changes
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI models — provider abstraction surface */}
        <motion.div variants={fadeUp} custom={1}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-4 text-primary" /> AI models
              </CardTitle>
              <CardDescription>
                Swap providers per stage — business logic never changes. Unavailable providers need an
                API key in the environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {MODEL_STAGES.map(({ stage, kind, icon: Icon }) => {
                const pool = providers?.[kind] ?? [];
                const current = workspace.model_preferences?.[stage] ?? "";
                return (
                  <div
                    key={stage}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/50 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-[13px] font-medium">{STAGE_LABELS[stage]}</span>
                    </div>
                    <Select
                      value={current || "auto"}
                      onValueChange={(v) =>
                        update.mutate({
                          id: workspace.id,
                          patch: {
                            model_preferences: {
                              ...workspace.model_preferences,
                              [stage]: v === "auto" ? undefined : v,
                            },
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-40 shrink-0 text-[12.5px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (best available)</SelectItem>
                        {pool.map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={!p.available}>
                            <span className="flex items-center gap-2">
                              {p.label}
                              {!p.available && (
                                <Badge variant="outline" className="text-[10px]">
                                  no key
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team */}
        <motion.div variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" /> Team
              </CardTitle>
              <CardDescription>Everyone reviewing and steering this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(members ?? []).map((m) => {
                const p = m.profile;
                const initials = (p?.full_name ?? p?.email ?? "?")
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={m.user_id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3">
                    <Avatar className="size-8">
                      <AvatarImage src={p?.avatar_url ?? undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">
                        {p?.full_name ?? p?.email}
                        {m.user_id === profile?.id && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{p?.email}</div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {m.role}
                    </Badge>
                  </div>
                );
              })}
              <p className="pt-1 text-[12px] text-muted-foreground">
                Invite teammates by adding them to the workspace in Supabase — invite emails ship with
                your auth provider of choice.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/50 px-4 py-3">
      <div>
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="text-[12px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
