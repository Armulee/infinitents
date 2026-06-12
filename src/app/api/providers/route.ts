import { NextResponse } from "next/server";
import { listProviderOptions } from "@/server/providers/registry";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Settings → AI Models: which providers are configured and selectable. */
export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(listProviderOptions());
}
