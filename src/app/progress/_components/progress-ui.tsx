import * as React from "react";
import { ACHIEVEMENT_LEVELS, type AchievementLevel } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  MetricComparison,
  TrendDirection,
} from "@/types/habit-progress-types";

export function formatPercentage(value: number | null): string {
  return value === null ? "N/A" : `${Math.round(value)}%`;
}

export function formatPercentagePoints(delta: number | null): string {
  if (delta === null) return "N/A";
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "0 pts";
  return `${rounded > 0 ? "+" : "-"}${Math.abs(rounded)} pts`;
}

export function formatDayDelta(delta: number | null): string {
  if (delta === null) return "N/A";
  if (delta === 0) return "0 days";
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta)} ${
    Math.abs(delta) === 1 ? "day" : "days"
  }`;
}

function trendClassName(direction: TrendDirection): string {
  if (direction === "up") return "text-emerald-600 dark:text-emerald-400";
  if (direction === "down") return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function trendArrow(direction: TrendDirection): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

export function TrendValue({
  direction,
  children,
  className,
}: {
  direction: TrendDirection;
  children: React.ReactNode;
  className?: string;
}) {
  if (direction === "na") {
    return (
      <span
        className={cn(
          "inline-flex items-center font-medium text-muted-foreground",
          className,
        )}
      >
        N/A
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        trendClassName(direction),
        className,
      )}
    >
      <span aria-hidden="true">{trendArrow(direction)}</span>
      <span>{children}</span>
    </span>
  );
}

export function LevelBadge({
  level,
  className,
}: {
  level: AchievementLevel | null;
  className?: string;
}) {
  if (!level) {
    return (
      <span
        className={cn(
          "text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        N/A
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-bold text-white",
        className,
      )}
      style={{ backgroundColor: level.color }}
    >
      {level.label}
    </span>
  );
}

export function LevelChange({
  current,
  previous,
  comparison,
  className,
}: {
  current: AchievementLevel | null;
  previous: AchievementLevel | null;
  comparison: MetricComparison;
  className?: string;
}) {
  if (comparison.levelTrend === "na" || !current || !previous) {
    return (
      <span className={cn("text-muted-foreground", className)}>N/A</span>
    );
  }

  const label =
    comparison.levelTrend === "up"
      ? "Improved"
      : comparison.levelTrend === "down"
        ? "Declined"
        : "No change";

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-1 font-medium",
        trendClassName(comparison.levelTrend),
        className,
      )}
    >
      <span aria-hidden="true">{trendArrow(comparison.levelTrend)}</span>
      <span>{label}</span>
      <span className="font-normal text-muted-foreground">
        (was {previous.label})
      </span>
    </span>
  );
}

export function ProgressBar({
  percentage,
  color,
  label,
}: {
  percentage: number | null;
  color?: string;
  label: string;
}) {
  // The bar itself fills to at most 100%; overachievement stays visible in
  // the value text and in the surrounding percentage labels.
  const render = percentage === null ? 0 : Math.min(100, Math.max(0, percentage));

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage === null ? undefined : Math.round(render)}
      aria-valuetext={
        percentage === null ? "Not applicable" : `${Math.round(percentage)}%`
      }
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          !color && "bg-primary",
        )}
        style={{
          width: `${render}%`,
          ...(color ? { backgroundColor: color } : {}),
        }}
      />
    </div>
  );
}

export function LevelLegend() {
  const ascendingLevels = [...ACHIEVEMENT_LEVELS].sort(
    (a, b) => a.minScore - b.minScore,
  );

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Level thresholds</span>
        {ascendingLevels.map((level, index) => {
          const next = ascendingLevels[index + 1];
          const range = next
            ? `${level.minScore}–${next.minScore - 1}%`
            : `${level.minScore}%+`;

          return (
            <span key={level.label} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: level.color }}
                aria-hidden="true"
              />
              <span>
                {level.label} {range}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
