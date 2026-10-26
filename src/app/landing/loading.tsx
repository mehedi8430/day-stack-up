import { Skeleton } from "@/components/ui/skeleton";

const FEATURE_CARDS = Array.from({ length: 4 }, (_, index) => index);
const STEPS = Array.from({ length: 3 }, (_, index) => index);

export default function LandingLoading() {
  return (
    <div
      className="min-h-screen"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="border-b bg-background/80">
        <div className="mx-auto flex h-14 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="size-10 shrink-0 rounded-md sm:size-12" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="hidden h-2.5 w-36 sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-9 w-20 sm:block" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8">
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0 space-y-5">
              <Skeleton className="h-6 w-64 max-w-full rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-12 w-full max-w-lg" />
                <Skeleton className="h-12 w-4/5 max-w-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-lg" />
                <Skeleton className="h-4 w-3/4 max-w-md" />
              </div>
              <div className="flex flex-wrap gap-3 pt-3">
                <Skeleton className="h-11 w-44" />
                <Skeleton className="h-11 w-40" />
              </div>
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="aspect-video w-full rounded-2xl" />
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURE_CARDS.map((card) => (
              <div
                key={card}
                className="space-y-4 rounded-2xl border bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <Skeleton className="h-5 w-40 max-w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 rounded-2xl border bg-muted/40 p-6 sm:grid-cols-3 sm:p-8">
            {STEPS.map((step) => (
              <div key={step} className="space-y-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-5 w-32 max-w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="rounded-3xl bg-foreground px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="h-9 w-72 max-w-full bg-background/20" />
              <Skeleton className="h-4 w-full max-w-xl bg-background/20" />
              <Skeleton className="h-4 w-3/4 max-w-md bg-background/20" />
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <Skeleton className="h-11 w-44 bg-background/20" />
                <Skeleton className="h-11 w-24 bg-background/20" />
              </div>
              <Skeleton className="h-3 w-64 max-w-full bg-background/20" />
            </div>
          </div>
        </section>

        <footer className="border-t py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Skeleton className="h-4 w-64 max-w-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </footer>
      </main>

      <span className="sr-only">Loading landing page...</span>
    </div>
  );
}
