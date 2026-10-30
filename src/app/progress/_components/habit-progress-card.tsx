import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCategory, getWeeklyTargetLabel, type Habit } from "@/lib/types";
import { formatTargetCount } from "@/lib/habit-progress";
import type {
  MetricComparison,
  PeriodMetric,
} from "@/types/habit-progress-types";
import {
  formatDayDelta,
  formatPercentage,
  formatPercentagePoints,
  LevelBadge,
  LevelChange,
  TrendValue,
} from "./progress-ui";
import { cn } from "@/lib/utils";

interface HabitProgressCardProps {
  habit: Habit;
  current: PeriodMetric;
  previous: PeriodMetric;
  comparison: MetricComparison;
  focused?: boolean;
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
  focused = false,
  periodNoun,
  previousLabel,
}: HabitProgressCardProps) {
  const category = getCategory(habit.category);
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const percentage = current.percentage;
  const visualPercentage =
    percentage === null ? 0 : Math.min(100, Math.max(0, percentage));
  const strokeOffset =
    circumference - (visualPercentage / 100) * circumference;

  const content = (
    <>
      <CardHeader
        className={cn(
          "pb-3",
          focused && "p-0 pb-3",
        )}
      >
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
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">
                {getWeeklyTargetLabel(habit.weeklyTarget)}
              </span>
            </CardDescription>
          </div>
          <LevelBadge level={current.level} />
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "space-y-4",
          focused && "p-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-4">
          <svg
            className="h-28 w-28 shrink-0"
            viewBox="0 0 64 64"
            role="progressbar"
            aria-label={`${habit.name} completion for this ${periodNoun}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              percentage === null
                ? undefined
                : Math.round(visualPercentage)
            }
            aria-valuetext={formatPercentage(percentage)}
          >
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={category.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 32 32)"
              className="transition-[stroke-dashoffset]"
            />
            <text
              x="32"
              y="34"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[11px] font-semibold"
            >
              {formatPercentage(percentage)}
            </text>
          </svg>
          <div className="min-w-[10rem] flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {current.target === 0
                ? "No target days in this period"
                : `${current.completed} of ${formatTargetCount(current.target)} target days`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {periodNoun === "week" ? "Weekly" : "Monthly"} completion
            </p>
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
              {previous.target === 0
                ? "No target days"
                : `${previous.completed}/${formatTargetCount(previous.target)} days`}
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
    </>
  );

  return focused ? (
    <section className="w-full space-y-1">{content}</section>
  ) : (
    <Card className="h-full">{content}</Card>
  );
}
