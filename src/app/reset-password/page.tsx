"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark, Wordmark } from "@/components/shell/logo";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Landing page for password-recovery sessions (/auth/callback or
 * /auth/confirm with type=recovery redirect here). The route is protected by
 * the middleware, so only an authenticated (recovery) session reaches it.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[-200px] mx-auto h-[420px] max-w-2xl rounded-full opacity-20 blur-[110px]"
        style={{ background: "radial-gradient(closest-side, oklch(0.55 0.2 285), transparent)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm"
      >
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark />
          <Wordmark />
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-1 inline-flex rounded-lg bg-primary/12 p-2 text-primary">
            <KeyRound className="size-4" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            You&apos;re signed in via your recovery link — set the new password below.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Update password
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
