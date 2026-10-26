import { Skeleton } from "@/components/ui/skeleton";

const SUMMARY_CARDS = Array.from({ length: 4 }, (_, index) => index);
const STREAK_CARDS = Array.from({ length: 6 }, (_, index) => index);
const HEATMAP_WEEKS = Array.from({ length: 20 }, (_, index) => index);
const HEATMAP_DAYS = Array.from({ length: 7 }, (_, index) => index);
const HEATMAP_LEVELS = Array.from({ length: 5 }, (_, index) => index);

function ChartCardSkeleton({
  chartClassName,
  hasControls = false,
}: {
  chartClassName: string;
  hasControls?: boolean;
}) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36 max-w-full" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        {hasControls && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        )}
      </div>
      <Skeleton className={`mt-6 w-full ${chartClassName}`} />
    </section>
  );
}

export default function AnalyticsLoading() {
  return (
    <div
      className="p-4 sm:p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-10" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="size-10" />
            </div>
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUMMARY_CARDS.map((card) => (
            <div
              key={card}
              className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          ))}
        </div>

        <ChartCardSkeleton chartClassName="h-64" hasControls />
        <ChartCardSkeleton chartClassName="h-96" />
        <ChartCardSkeleton chartClassName="h-64" />

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-2 h-3 w-72 max-w-full" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STREAK_CARDS.map((card) => (
              <div
                key={card}
                className="space-y-3 rounded-lg border p-4"
              >
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-3 w-80 max-w-full" />
          <div className="mt-6 flex gap-1 overflow-hidden">
            {HEATMAP_WEEKS.map((week) => (
              <div key={week} className="flex flex-col gap-1">
                {HEATMAP_DAYS.map((day) => (
                  <Skeleton key={day} className="size-3.5 rounded-sm" />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-1.5">
            <Skeleton className="mr-1 h-3 w-8" />
            {HEATMAP_LEVELS.map((level) => (
              <Skeleton key={level} className="size-3 rounded-sm" />
            ))}
            <Skeleton className="ml-1 h-3 w-8" />
          </div>
        </section>
      </div>

      <span className="sr-only">Loading analytics...</span>
    </div>
  );
}
