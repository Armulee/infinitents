"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LogoMark, Wordmark } from "@/components/shell/logo";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.59-5.17 3.59-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.21 7.21 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.74l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.63l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

const COPY: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to review what your content department produced.",
    cta: "Sign in",
  },
  signup: {
    title: "Create your content OS",
    subtitle: "Your autonomous content department starts here.",
    cta: "Create account",
  },
  reset: {
    title: "Reset your password",
    subtitle: "We'll email you a secure link to choose a new one.",
    cta: "Send reset link",
  },
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const next = params.get("next") ?? "/dashboard";

  // Surface failures forwarded by /auth/callback and /auth/confirm.
  useEffect(() => {
    const error = params.get("error");
    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace(`/login${params.get("mode") === "signup" ? "?mode=signup" : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInWithGoogle() {
    setGoogleLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          // Always show the account chooser; request a refresh token.
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // On success the browser navigates away to Google — keep the spinner.
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = supabaseBrowser();
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setNotice("If an account exists for that email, a reset link is on its way.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        // With "Confirm email" enabled there's no session yet — tell the user
        // instead of bouncing them off the protected dashboard.
        if (!data.session) {
          setNotice("Check your inbox — confirm your email to activate the account.");
          return;
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const copy = COPY[mode];

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
          <h1 className="text-lg font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{copy.subtitle}</p>

          {notice ? (
            <div className="mt-6">
              <div className="flex gap-2.5 rounded-xl border border-primary/25 bg-primary/8 p-3.5 text-[13px] leading-relaxed">
                <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{notice}</span>
              </div>
              <Button
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => {
                  setNotice(null);
                  setMode("signin");
                }}
              >
                <ArrowLeft /> Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {mode !== "reset" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 w-full"
                    onClick={signInWithGoogle}
                    disabled={googleLoading || loading}
                  >
                    {googleLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
                    Continue with Google
                  </Button>

                  <div className="mt-5 flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      or
                    </span>
                    <Separator className="flex-1" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      required
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>
                {mode !== "reset" && (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => setMode("reset")}
                          className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      minLength={8}
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {copy.cta}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[13px] text-muted-foreground">
          {mode === "reset" ? (
            <button
              onClick={() => setMode("signin")}
              className="font-medium text-primary hover:underline"
            >
              Back to sign in
            </button>
          ) : (
            <>
              {mode === "signup" ? "Already have an account? " : "New to Infinitents? "}
              <button
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="font-medium text-primary hover:underline"
              >
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
