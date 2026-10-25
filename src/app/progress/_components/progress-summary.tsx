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
} from "@/lib/habit-progress";
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Overall completion</CardDescription>
          <CardTitle className="text-3xl">
            {formatPercentage(overall.percentage)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Achievement level</CardDescription>
          <CardTitle>
            <LevelBadge level={overall.level} className="text-lg" />
          </CardTitle>
        </CardHeader>
        <CardContent>
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

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Completed days</CardDescription>
          <CardTitle className="text-3xl">
            {overall.target === 0 ? "N/A" : overall.completed}
          </CardTitle>
        </CardHeader>
        <CardContent>
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

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Change vs previous</CardDescription>
          <CardTitle className="text-2xl">
            <TrendValue direction={comparison.trend}>
              {formatPercentagePoints(comparison.percentageDelta)}
            </TrendValue>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
