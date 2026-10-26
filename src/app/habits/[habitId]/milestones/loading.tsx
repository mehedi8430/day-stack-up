export default function MilestonesLoading() {
  return (
    <main
      className="space-y-10 px-5 py-8 sm:px-8 sm:py-10 lg:px-12"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="space-y-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="h-9 w-full max-w-xl animate-pulse rounded-lg bg-muted sm:h-10" />
          <div className="h-10 w-36 shrink-0 animate-pulse rounded-md bg-muted" />
        </div>
      </header>

      <section className="w-full rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <div className="mt-1.5 size-3 shrink-0 animate-pulse rounded-[3px] bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-56 max-w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-72 max-w-full animate-pulse rounded bg-muted/70" />
          </div>
        </div>

        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="size-5 shrink-0 animate-pulse rounded bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
              </div>
              <div className="h-6 w-20 shrink-0 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </section>

      <span className="sr-only">Loading milestones...</span>
    </main>
  );
}
