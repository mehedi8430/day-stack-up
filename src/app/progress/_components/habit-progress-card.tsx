import { getCategory, type Habit } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MetricComparison, PeriodMetric } from "@/lib/habit-progress";
import {
  formatDayDelta,
  formatPercentage,
  formatPercentagePoints,
  LevelBadge,
  LevelChange,
  ProgressBar,
  TrendValue,
} from "./progress-ui";

interface HabitProgressCardProps {
  habit: Habit;
  current: PeriodMetric;
  previous: PeriodMetric;
  comparison: MetricComparison;
  /** "week" or "month", used for the progress-bar label. */
  periodNoun: string;
  /** "Previous week" or "Previous week (same span)". */
  previousLabel: string;
}

export function HabitProgressCard({
  habit,
  current,
  previous,
  comparison,
  periodNoun,
  previousLabel,
}: HabitProgressCardProps) {
  const category = getCategory(habit.category);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {habit.emoji && (
                <span className="shrink-0 text-xl" aria-hidden="true">
                  {habit.emoji}
                </span>
              )}
              <span className="truncate">{habit.name}</span>
            </CardTitle>
            <CardDescription className="mt-1.5 flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              {category.label}
            </CardDescription>
          </div>
          <LevelBadge level={current.level} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <p className="text-3xl font-bold tracking-tight">
              {formatPercentage(current.percentage)}
            </p>
            <p className="text-sm text-muted-foreground">
              {current.expected === 0
                ? "No scheduled days"
                : `${current.completed} of ${current.expected} scheduled days`}
            </p>
          </div>
          <div className="mt-2">
            <ProgressBar
              percentage={current.percentage}
              color={category.color}
              label={`${habit.name} completion for this ${periodNoun}`}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {previousLabel}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {formatPercentage(previous.percentage)}
            </p>
            <p className="text-xs text-muted-foreground">
              {previous.expected === 0
                ? "No eligible days"
                : `${previous.completed}/${previous.expected} days`}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Level</span>
              <LevelBadge level={previous.level} className="text-[10px]" />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Change
            </p>
            <TrendValue
              direction={comparison.trend}
              className="mt-1 text-lg font-semibold"
            >
              {formatPercentagePoints(comparison.percentageDelta)}
            </TrendValue>
            <p className="mt-1 text-xs text-muted-foreground">
              {comparison.completedDelta === null ? (
                "Completed-day change: N/A"
              ) : (
                <>
                  <TrendValue direction={comparison.completedTrend}>
                    {formatDayDelta(comparison.completedDelta)}
                  </TrendValue>{" "}
                  completed days
                </>
              )}
            </p>
            <p className="mt-2 text-xs">
              <span className="text-muted-foreground">Level: </span>
              <LevelChange
                current={current.level}
                previous={previous.level}
                comparison={comparison}
              />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
