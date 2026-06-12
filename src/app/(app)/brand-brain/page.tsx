"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Check,
  GraduationCap,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAiJobs, useBrandKnowledge, useEnqueueStage, useUpdateKnowledge } from "@/hooks/use-queries";
import { useWorkspace } from "@/lib/workspace-context";
import { fadeUp, staggerChildren } from "@/lib/motion";
import { timeAgo } from "@/lib/utils";

export default function BrandBrainPage() {
  const { brand } = useWorkspace();
  const { data: knowledge, isLoading } = useBrandKnowledge();
  const { data: activeJobs } = useAiJobs({ activeOnly: true });
  const enqueue = useEnqueueStage();

  const extracting = (activeJobs ?? []).some((j) => j.stage === "brand_extraction");

  return (
    <PageContainer>
      <PageHeader
        title="Brand Brain"
        description={
          knowledge
            ? `v${knowledge.version} · updated ${timeAgo(knowledge.updated_at)} · powers every idea, script and audit`
            : "The knowledge base that powers every idea, script and audit."
        }
        actions={
          <Button
            variant="secondary"
            disabled={!brand || extracting}
            onClick={() =>
              enqueue.mutate({ stage: "brand_extraction", payload: { brand_id: brand!.id } })
            }
          >
            {extracting ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {extracting ? "Extracting…" : "Re-extract from sources"}
          </Button>
        }
      />

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !knowledge ? (
        <EmptyBrain
          extracting={extracting}
          onExtract={() =>
            brand && enqueue.mutate({ stage: "brand_extraction", payload: { brand_id: brand.id } })
          }
        />
      ) : (
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
          className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          <motion.div variants={fadeUp} custom={0} className="lg:col-span-2">
            <EditableCard
              icon={Target}
              title="Positioning"
              value={knowledge.positioning ?? ""}
              knowledgeId={knowledge.id}
              field="positioning"
            />
          </motion.div>

          <motion.div variants={fadeUp} custom={1}>
            <EditableCard
              icon={Users}
              title="Audience"
              value={knowledge.audience ?? ""}
              knowledgeId={knowledge.id}
              field="audience"
            />
          </motion.div>

          <motion.div variants={fadeUp} custom={2}>
            <EditableCard
              icon={Sparkles}
              title="Unique Selling Proposition"
              value={knowledge.usp ?? ""}
              knowledgeId={knowledge.id}
              field="usp"
            />
          </motion.div>

          {/* Personas */}
          <motion.div variants={fadeUp} custom={3} className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[14px]">
                  <Users className="size-4 text-primary" /> Personas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {knowledge.personas.map((p, i) => (
                  <div key={i} className="rounded-xl border border-border/70 bg-background/50 p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-semibold">{p.name}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {p.age} · {p.occupation}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-[12.5px] leading-relaxed">
                      <div>
                        <span className="font-medium text-success">Goals — </span>
                        <span className="text-muted-foreground">{p.goals?.join(" · ")}</span>
                      </div>
                      <div>
                        <span className="font-medium text-destructive">Frustrations — </span>
                        <span className="text-muted-foreground">{p.frustrations?.join(" · ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pain points */}
          <motion.div variants={fadeUp} custom={4}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[14px]">
                  <Target className="size-4 text-destructive" /> Pain points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {knowledge.pain_points.map((p, i) => (
                  <div key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-destructive/60" />
                    <span className="text-muted-foreground">{p}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Voice */}
          <motion.div variants={fadeUp} custom={5}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[14px]">
                  <Megaphone className="size-4 text-chart-4" /> Brand voice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px]">
                <p className="leading-relaxed text-muted-foreground">{knowledge.brand_voice?.tone}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(knowledge.brand_voice?.vocabulary ?? []).map((w) => (
                    <Badge key={w} variant="secondary">
                      {w}
                    </Badge>
                  ))}
                  {(knowledge.brand_voice?.avoid ?? []).map((w) => (
                    <Badge key={w} variant="destructive" className="line-through opacity-70">
                      {w}
                    </Badge>
                  ))}
                </div>
                {knowledge.brand_voice?.example && (
                  <blockquote className="border-l-2 border-primary/50 pl-3 text-[12.5px] italic leading-relaxed text-muted-foreground">
                    “{knowledge.brand_voice.example}”
                  </blockquote>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Content pillars */}
          <motion.div variants={fadeUp} custom={6} className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[14px]">
                  <Brain className="size-4 text-primary" /> Content pillars
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                  {knowledge.content_pillars.map((p, i) => (
                    <div
                      key={p.name}
                      style={{
                        width: `${p.ratio}%`,
                        background: `var(--color-chart-${(i % 5) + 1})`,
                      }}
                      className="first:rounded-l-full last:rounded-r-full"
                    />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {knowledge.content_pillars.map((p, i) => (
                    <div key={p.name} className="rounded-xl border border-border/70 bg-background/50 p-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: `var(--color-chart-${(i % 5) + 1})` }}
                        />
                        <span className="text-[13px] font-semibold">{p.name}</span>
                        <span className="ml-auto text-[12px] font-bold text-muted-foreground tnum">
                          {p.ratio}%
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learnings — the learning loop */}
          <motion.div variants={fadeUp} custom={7} className="lg:col-span-2">
            <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.05] to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[14px]">
                  <GraduationCap className="size-4 text-primary" /> What the system has learned
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {knowledge.learnings.length === 0 ? (
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    After your first posts go live, performance data flows back here — and every future
                    idea gets sharper. The loop closes automatically.
                  </p>
                ) : (
                  knowledge.learnings.map((l, i) => (
                    <div key={i} className="rounded-xl border border-primary/15 bg-card/60 p-3.5">
                      <p className="text-[13.5px] font-medium leading-snug">{l.insight}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {l.evidence} · {timeAgo(l.at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}

function EditableCard({
  icon: Icon,
  title,
  value,
  knowledgeId,
  field,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  knowledgeId: string;
  field: "positioning" | "audience" | "usp";
}) {
  const [draft, setDraft] = useState(value);
  const update = useUpdateKnowledge();
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-[14px]">
          <Icon className="size-4 text-primary" /> {title}
        </CardTitle>
        {dirty && (
          <Button
            size="sm"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: knowledgeId, patch: { [field]: draft } })}
          >
            {update.isPending ? <Loader2 className="animate-spin" /> : <Check />}
            Save
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="resize-none border-transparent bg-transparent px-0 text-[13.5px] leading-relaxed shadow-none focus-visible:border-input focus-visible:px-3"
        />
      </CardContent>
    </Card>
  );
}

function EmptyBrain({ extracting, onExtract }: { extracting: boolean; onExtract: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-20 flex flex-col items-center text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        {extracting ? (
          <Loader2 className="size-7 animate-spin text-primary" />
        ) : (
          <Brain className="size-7 text-primary" />
        )}
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">
        {extracting ? "Reading your brand…" : "No knowledge yet"}
      </h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
        {extracting
          ? "Positioning, audience, personas, voice and pillars are being extracted. This takes a minute."
          : "Run extraction to build the Brand Brain from your website and description."}
      </p>
      {!extracting && (
        <Button className="mt-5" onClick={onExtract}>
          <Sparkles /> Extract brand knowledge
        </Button>
      )}
    </motion.div>
  );
}
