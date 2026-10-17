import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingClose({ isAuthed }: { isAuthed: boolean }) {
  return (
    <>
      <section className="py-12 sm:py-16">
        <div className="rounded-3xl bg-foreground px-6 py-12 text-center text-background sm:px-12 sm:py-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Start stacking today
          </h2>
          <p className="mx-auto mt-3 max-w-xl opacity-80">
            Set up your first habits in under a minute. Your calendar starts
            filling the moment you tick today off.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 bg-background px-6 text-base text-foreground hover:bg-background/90 dark:bg-background dark:text-foreground"
            >
              <Link href={isAuthed ? "/" : "/signup"}>
                {isAuthed ? "Open app" : "Start stacking free"}
              </Link>
            </Button>
            {!isAuthed && (
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-md px-6 text-base font-medium underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            )}
          </div>
          <p className="mt-5 text-xs opacity-70">
            Free to use &middot; Email &amp; password sign-up &middot; Your
            progress, your data
          </p>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p className="font-medium text-foreground">
            DayStackUp — Stack your day. Keep moving up.
          </p>
          <nav className="flex items-center gap-4">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            {!isAuthed && (
              <Link href="/login" className="hover:text-foreground">
                Log in
              </Link>
            )}
            <Link
              href={isAuthed ? "/" : "/signup"}
              className="font-medium text-foreground hover:underline"
            >
              {isAuthed ? "Open app" : "Start free"}
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
