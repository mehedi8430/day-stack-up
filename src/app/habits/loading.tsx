import { Skeleton } from "@/components/ui/skeleton";

const HABIT_ROWS = Array.from({ length: 5 }, (_, index) => index);

export default function HabitsLoading() {
  return (
    <div
      className="space-y-6 p-4 sm:p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-160">
            <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-4 bg-muted/50 px-5 py-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-20 justify-self-end" />
            </div>

            <div className="divide-y">
              {HABIT_ROWS.map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[2fr_1fr_2fr_auto] items-center gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Skeleton className="size-6 shrink-0 rounded" />
                    <Skeleton className="h-4 w-32 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full max-w-sm" />
                    <Skeleton className="h-3 w-2/3 max-w-xs" />
                  </div>
                  <Skeleton className="h-4 w-16 justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only">Loading habits...</span>
    </div>
  );
}
