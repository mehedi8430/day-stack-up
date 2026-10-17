import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "./_components/landing-nav";
import { LandingHero } from "./_components/landing-hero";
import { LandingFeatures } from "./_components/landing-features";
import { LandingClose } from "./_components/landing-close";

export const metadata: Metadata = {
  title: "DayStackUp — Stack your day. Keep moving up.",
  description:
    "Track habits on a monthly calendar, time-block your days in the planner, break goals into milestones, and watch streaks grow with analytics. Free to start.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;

  return (
    <div className="min-h-screen">
      <LandingNav isAuthed={isAuthed} />
      <main className="px-4 sm:px-6 lg:px-8">
        <LandingHero isAuthed={isAuthed} />
        <LandingFeatures />
        <LandingClose isAuthed={isAuthed} />
      </main>
    </div>
  );
}
