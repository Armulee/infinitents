import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

/** Studio is full-bleed — no app sidebar. CapCut focus, Canva friendliness. */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/");
  }
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
