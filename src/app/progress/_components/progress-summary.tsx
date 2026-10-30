import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTargetCount } from "@/lib/habit-progress";
import type {
  MetricComparison,
  PeriodMetric,
  ProgressPeriod,
} from "@/types/habit-progress-types";
import {
  formatDayDelta,
  formatPercentage,
  formatPercentagePoints,
  LevelBadge,
  LevelChange,
  ProgressBar,
  TrendValue,
} from "./progress-ui";

interface ProgressSummaryProps {
  overall: PeriodMetric;
  previous: PeriodMetric;
  comparison: MetricComparison;
  period: ProgressPeriod;
  /** "previous week" or "previous month". */
  previousLabel: string;
}

export function ProgressSummary({
  overall,
  previous,
  comparison,
  period,
  previousLabel,
}: ProgressSummaryProps) {
  const comparisonContext = period.isFuture
    ? "Comparison starts when the period begins."
    : period.isCurrent
      ? "Compared with the complete previous period (full-period goals)."
      : `Compared with the ${previousLabel}.`;

  return (
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <Card className="rounded-2xl shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">
            Overall completion
          </CardDescription>
          <CardTitle className="pt-1 text-3xl tracking-tight">
            {formatPercentage(overall.percentage)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-xs text-muted-foreground">
            {overall.target === 0
              ? "No target habit-days in this period"
              : `${overall.completed} of ${formatTargetCount(overall.target)} target habit-days`}
          </p>
          <ProgressBar
            percentage={overall.percentage}
            label="Overall habit completion for the selected period"
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">
            Achievement level
          </CardDescription>
          <CardTitle className="pt-2">
            <LevelBadge level={overall.level} className="text-lg" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-xs text-muted-foreground">
            Based on the existing OKR score thresholds.
          </p>
          <p className="mt-2 text-xs">
            <span className="text-muted-foreground">Level: </span>
            <LevelChange
              current={overall.level}
              previous={previous.level}
              comparison={comparison}
            />
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">
            Completed days
          </CardDescription>
          <CardTitle className="pt-1 text-3xl tracking-tight">
            {overall.target === 0 ? "N/A" : overall.completed}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-xs text-muted-foreground">
            {overall.target === 0
              ? "No target days"
              : `out of ${formatTargetCount(overall.target)} target days`}
          </p>
          <p className="mt-2 text-xs">
            {comparison.completedDelta === null ? (
              <span className="text-muted-foreground">
                Completed-day change: N/A
              </span>
            ) : (
              <>
                <TrendValue direction={comparison.completedTrend}>
                  {formatDayDelta(comparison.completedDelta)}
                </TrendValue>{" "}
                <span className="text-muted-foreground">
                  completed days vs previous
                </span>
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wide">
            Change vs previous
          </CardDescription>
          <CardTitle className="pt-1 text-2xl tracking-tight">
            <TrendValue direction={comparison.trend}>
              {formatPercentagePoints(comparison.percentageDelta)}
            </TrendValue>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-xs text-muted-foreground">
            {previous.target === 0
              ? "No data for the previous period"
              : `Previous: ${formatPercentage(previous.percentage)} (${previous.completed}/${formatTargetCount(previous.target)} days)`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {comparisonContext}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
