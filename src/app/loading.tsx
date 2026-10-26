import { Skeleton } from "@/components/ui/skeleton";

const DAYS = Array.from({ length: 7 }, (_, index) => index);
const ROWS = Array.from({ length: 5 }, (_, index) => index);

export default function HomeLoading() {
  return (
    <div
      className="space-y-6 p-4 sm:p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 shrink-0" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="size-10" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="size-10" />
            <Skeleton className="h-9 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-10 sm:w-36" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-3 w-48 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="flex min-w-max">
            <div className="w-[180px] border-r bg-card px-3 py-3 sm:w-[340px]">
              <Skeleton className="h-4 w-14" />
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex w-10 flex-col items-center gap-1 border-r py-2 sm:w-12"
              >
                <Skeleton className="h-3 w-6" />
                <Skeleton className="size-7 rounded-full" />
              </div>
            ))}
            <div className="flex w-12 items-center justify-center border-l bg-card py-3">
              <Skeleton className="size-4" />
            </div>
          </div>

          {ROWS.map((row) => (
            <div key={row} className="flex min-w-max border-t">
              <div className="flex w-[180px] items-center gap-2 border-r bg-card px-3 py-2 sm:w-[340px]">
                <Skeleton className="size-4 shrink-0" />
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="size-2 shrink-0 rounded-full" />
                <Skeleton className="ml-auto size-7 shrink-0" />
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex w-10 items-center justify-center border-r py-2 sm:w-12"
                >
                  <Skeleton className="size-7 rounded-md" />
                </div>
              ))}
              <div className="flex w-12 items-center justify-center border-l bg-card py-2">
                <Skeleton className="h-4 w-6" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading habit calendar...</span>
    </div>
  );
}
