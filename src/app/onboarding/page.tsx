"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Brain, Globe, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LogoMark, Wordmark } from "@/components/shell/logo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";

const STEPS = ["Workspace", "Brand", "Outcomes"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState(3);
  const [autopilot, setAutopilot] = useState(true);

  async function launch() {
    setLoading(true);
    const supabase = supabaseBrowser();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // 1. Workspace
      const slug = `${slugify(workspaceName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .insert({
          name: workspaceName,
          slug,
          owner_id: user.id,
          daily_video_target: target,
          autopilot,
        })
        .select("id")
        .single();
      if (wsErr) throw wsErr;
      const workspaceId = (ws as { id: string }).id;

      // 2. Membership (owner)
      const { error: memErr } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: user.id, role: "owner" });
      if (memErr) throw memErr;

      // 3. Brand
      const { data: brand, error: brandErr } = await supabase
        .from("brands")
        .insert({
          workspace_id: workspaceId,
          name: brandName,
          website_url: websiteUrl || null,
          description: description || null,
        })
        .select("id")
        .single();
      if (brandErr) throw brandErr;
      const brandId = (brand as { id: string }).id;

      // 4. Kick the pipeline: Brand Brain extraction + first idea batch.
      // NB: batch-insert rows must share an identical key set — PostgREST
      // sends the union of columns and fills gaps with explicit NULLs,
      // bypassing database defaults.
      const { error: jobErr } = await supabase.from("ai_jobs").insert([
        {
          workspace_id: workspaceId,
          stage: "brand_extraction",
          payload: { brand_id: brandId },
          brand_id: brandId,
          priority: 9,
          scheduled_at: new Date().toISOString(),
        },
        {
          workspace_id: workspaceId,
          stage: "idea_generation",
          payload: { brand_id: brandId, count: target * 2 },
          brand_id: brandId,
          priority: 4,
          scheduled_at: new Date(Date.now() + 5_000).toISOString(),
        },
      ]);

      localStorage.setItem("infinitents-active-workspace", workspaceId);

      // The workspace is fully created at this point — a kickoff hiccup must
      // not fail the launch (re-running onboarding would duplicate it).
      if (jobErr) {
        console.error("pipeline kickoff failed:", jobErr);
        toast.warning("Workspace created — pipeline kickoff needs a nudge", {
          description:
            "Run “Extract brand knowledge” in Brand Brain and “Generate ideas” on the Dashboard.",
        });
      } else {
        toast.success("Your content department is live", {
          description: "Brand Brain extraction and your first idea batch are running.",
        });
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
      setLoading(false);
    }
  }

  const canNext =
    step === 0 ? workspaceName.trim().length > 1 : step === 1 ? brandName.trim().length > 1 : true;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <Wordmark />
        </div>
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= step ? "w-8 bg-primary" : "w-4 bg-secondary"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              >
                <div className="mb-2 inline-flex rounded-lg bg-primary/12 p-2 text-primary">
                  <Rocket className="size-5" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Name your workspace</h1>
                <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                  The home for your brands, content and team.
                </p>
                <div className="mt-6 space-y-1.5">
                  <Label htmlFor="ws">Workspace name</Label>
                  <Input
                    id="ws"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Acme Studio"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              >
                <div className="mb-2 inline-flex rounded-lg bg-primary/12 p-2 text-primary">
                  <Brain className="size-5" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Teach the Brand Brain</h1>
                <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                  We&apos;ll extract positioning, audience, voice and content pillars automatically.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="brand">Brand name</Label>
                    <Input
                      id="brand"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Acme"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="url" className="flex items-center gap-1.5">
                      <Globe className="size-3.5" /> Website <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="url"
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://acme.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="desc">What does this brand do?</Label>
                    <Textarea
                      id="desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="We help busy founders ship daily short-form content that actually converts…"
                      rows={3}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              >
                <h1 className="text-2xl font-semibold tracking-tight">Set the outcome</h1>
                <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                  Tell the system what to deliver. It handles everything else.
                </p>

                <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-baseline justify-between">
                    <Label>Videos per day</Label>
                    <span className="text-3xl font-semibold tracking-tight text-primary tnum">
                      {target}
                    </span>
                  </div>
                  <Slider
                    className="mt-4"
                    min={1}
                    max={20}
                    step={1}
                    value={[target]}
                    onValueChange={([v]) => setTarget(v)}
                  />
                  <p className="mt-3 text-[12.5px] text-muted-foreground">
                    The Viral Lab will generate {target * 2} ideas daily and produce the best{" "}
                    {target} into review-ready videos.
                  </p>

                  <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3">
                    <div>
                      <div className="text-[13.5px] font-medium">Autopilot</div>
                      <div className="text-[12px] text-muted-foreground">
                        Generate and produce daily without being asked
                      </div>
                    </div>
                    <Switch checked={autopilot} onCheckedChange={setAutopilot} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || loading}
            >
              <ArrowLeft /> Back
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button onClick={launch} disabled={loading} size="lg">
                {loading ? <Loader2 className="animate-spin" /> : <Rocket />}
                Launch my content department
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
