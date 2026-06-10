import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Only allow same-origin relative redirects ("/path", never "//host" or URLs). */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/dashboard";
  }
  return raw;
}

/**
 * PKCE code exchange — the landing point for Google OAuth (and any email link
 * that arrives with a `?code=` in the same browser that started the flow).
 * Exchanges the auth code for a cookie session, then forwards to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  // Behind a proxy/load balancer (e.g. Vercel) the original host arrives in
  // x-forwarded-host — redirect to the host the user actually sees.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  // The provider can return an error instead of a code (user denied consent…).
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(providerError)}`);
  }

  const code = searchParams.get("code");
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent("Sign-in link was invalid or expired. Please try again.")}`,
  );
}
