import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/dashboard";
  }
  return raw;
}

/**
 * Email-link verification via token_hash + verifyOtp. Unlike the PKCE code
 * flow, this works even when the email is opened in a different browser than
 * the one that started signup/reset — Supabase's recommended pattern for
 * confirmation and recovery emails (see README → email templates).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const type = OTP_TYPES.includes(typeParam as EmailOtpType) ? (typeParam as EmailOtpType) : null;
  const next = safeNext(searchParams.get("next"));

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (tokenHash && type && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Recovery links land on the password form; everything else continues on.
      return NextResponse.redirect(`${base}${type === "recovery" ? "/reset-password" : next}`);
    }
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(
    `${base}/login?error=${encodeURIComponent("Confirmation link was invalid or expired. Please try again.")}`,
  );
}
