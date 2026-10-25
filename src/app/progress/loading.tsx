export default function ProgressLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-8" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-10 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="h-16 animate-pulse rounded-lg border bg-muted/40" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>

      <span className="sr-only">Loading habit progress…</span>
    </div>
  );
}
