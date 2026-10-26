import { Skeleton } from "@/components/ui/skeleton";

const SIDEBAR_CARDS = Array.from({ length: 3 }, (_, index) => index);
const TASK_ROWS = Array.from({ length: 4 }, (_, index) => index);

export default function PlannerLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-9 w-56" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full max-w-xl" />
            <Skeleton className="h-3 w-4/5 max-w-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-11 w-44" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {SIDEBAR_CARDS.map((card) => (
              <div
                key={card}
                className="rounded-lg border bg-card p-4"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-28 max-w-full" />
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-20 w-full" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-28" />
            </div>
          </div>

          <section className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            {TASK_ROWS.map((row) => (
              <div
                key={row}
                className="rounded-xl border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-20 shrink-0" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 px-4 py-3">
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <span className="sr-only">Loading daily planner...</span>
    </div>
  );
}
