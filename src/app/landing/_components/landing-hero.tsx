import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { LandingPromoVideo } from "./landing-promo-video";

export function LandingHero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Free to start — your streak begins today
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Stack your day.
            <br />
            <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Keep moving up.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            DayStackUp turns daily habits into a visible stack: a monthly
            calendar that fills as you tick days off, a planner that keeps you
            honest, and streaks you will not want to break.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-6 text-base">
              <Link href={isAuthed ? "/" : "/signup"}>
                {isAuthed ? "Open app" : "Start stacking free"}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-6 text-base"
            >
              <a href="#features">See what it does</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Email &amp; password sign-up &middot; One-click habit tracking
            &middot; Light &amp; dark mode
          </p>
        </div>

        {/* Promo video — same visual language as the scenes below it */}
        <div className="relative min-w-0">
          <div
            aria-hidden
            className="absolute -inset-10 -z-10 rounded-full bg-primary/5 blur-3xl"
          />
          <LandingPromoVideo />
        </div>
      </div>
    </section>
  );
}
