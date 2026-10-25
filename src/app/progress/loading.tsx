export default function ProgressLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="rounded-3xl border bg-gradient-to-br from-primary/[0.07] via-card to-emerald-500/[0.08] px-5 py-6 shadow-sm sm:px-8 sm:py-9">
        <div className="mb-4 h-6 w-48 animate-pulse rounded-full bg-muted/80" />
        <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-muted sm:h-10" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-md bg-muted/70" />
        <div className="mt-2 h-4 w-3/4 max-w-xl animate-pulse rounded-md bg-muted/70" />
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-11 w-full animate-pulse rounded-md bg-muted sm:w-44" />
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="size-10 animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-36 animate-pulse rounded-md bg-muted sm:w-48" />
            <div className="size-10 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 rounded-2xl border border-primary/10 bg-primary/[0.035] px-4 py-3.5 sm:px-5">
        <div className="mt-0.5 size-4 shrink-0 animate-pulse rounded bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 max-w-lg animate-pulse rounded bg-muted" />
          <div className="h-3 w-full max-w-2xl animate-pulse rounded bg-muted/80" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-9 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/70" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-40 max-w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 max-w-full animate-pulse rounded bg-muted/70" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div className="h-10 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 max-w-[50%] animate-pulse rounded bg-muted/70" />
                </div>
                <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
              </div>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                <div className="h-28 animate-pulse rounded-xl border bg-muted/30" />
                <div className="h-28 animate-pulse rounded-xl border bg-muted/30" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading habit progress...</span>
    </div>
  );
}
