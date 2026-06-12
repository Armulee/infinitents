import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { AppShell } from "@/components/shell/app-shell";

// Authenticated app — always render per-request (session-dependent).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/");
  }
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
