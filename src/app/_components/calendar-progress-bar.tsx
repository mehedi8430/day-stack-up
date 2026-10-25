import { cn } from "@/lib/utils";

interface CalendarProgressBarProps {
  achieved: number;
  change: number;
  isFuture: boolean;
  comparisonLabel: string;
}

export function CalendarProgressBar({
  achieved,
  change,
  isFuture,
  comparisonLabel,
}: CalendarProgressBarProps) {
  const trendLabel = isFuture
    ? "Not started yet"
    : change > 0
      ? `↑ ${change}% from ${comparisonLabel}`
      : change < 0
        ? `↓ ${Math.abs(change)}% from ${comparisonLabel}`
        : `No change from ${comparisonLabel}`;

  const trendClassName = isFuture
    ? "text-muted-foreground"
    : change > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : change < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  const fill = Math.min(100, Math.max(0, achieved));

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Habit completion for the selected range"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fill}
        aria-valuetext={`${achieved}%`}
        title="Weighted by each habit's weekly target, creation date, and schedule history"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${fill}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] leading-tight sm:text-xs">
        <span
          className={cn("font-medium", trendClassName)}
          title="Percentage-point change compared with the previous period"
        >
          {trendLabel}
        </span>
        <span className="font-semibold text-foreground">
          {achieved}% achieved
        </span>
      </div>
    </div>
  );
}
