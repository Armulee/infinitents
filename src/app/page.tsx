import { LandingPage } from "@/components/landing/landing-page";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function Page() {
  return <LandingPage configured={configured} />;
}
