import { Trophy } from "lucide-react";
import { formatTargetCount } from "@/lib/habit-progress";
import { getLevel } from "@/lib/date";
import { LevelBadge } from "@/components/level-badge";
import type { RangeRateMetric } from "@/types/habit-progress-types";

interface WeeklyProgressCardProps {
  now: Date | null;
  percentage: number;
  weeklyRate: RangeRateMetric;
  habitCount: number;
}

export function WeeklyProgressCard({
  now,
  percentage,
  weeklyRate,
  habitCount,
}: WeeklyProgressCardProps) {
  const level =
    now && weeklyRate.target > 0 ? getLevel(percentage) : null;

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 via-card to-amber-100 p-5 text-foreground shadow-lg shadow-violet-900/15 dark:from-violet-500/30 dark:via-card dark:to-amber-500/20 dark:text-white sm:rounded-3xl sm:p-7">
      <div
        className="pointer-events-none absolute -right-10 -top-12 -z-10 size-44 rounded-full bg-white/50 blur-2xl dark:bg-white/10 sm:size-60"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground dark:text-white/85">
            Your overall progress
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight sm:text-5xl">
              {now ? `${percentage}%` : "—"}
            </span>
            <span className="rounded-full bg-foreground/10 px-2 py-1 text-xs font-medium text-foreground/90 dark:bg-white/15 dark:text-white/90">
              This week
            </span>
            {level && <LevelBadge level={level} />}
          </div>
          <p className="mt-2 text-sm text-muted-foreground dark:text-white/80">
            {weeklyRate.target > 0
              ? `${formatTargetCount(weeklyRate.completed)} of ${formatTargetCount(weeklyRate.target)} target days completed`
              : "Add a habit to start tracking your progress"}
          </p>
        </div>
        <div className="hidden shrink-0 items-center justify-center rounded-2xl bg-foreground/5 p-4 dark:bg-white/10 sm:flex">
          <Trophy className="size-12 text-amber-300" strokeWidth={1.7} />
        </div>
      </div>
      <div
        className="mt-5 h-2.5 overflow-hidden rounded-full bg-foreground/15 dark:bg-white/25"
        role="progressbar"
        aria-label="Overall progress this week"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percentage)}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] dark:bg-white"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground dark:text-white/75">
        {habitCount} {habitCount === 1 ? "habit" : "habits"} in your weekly
        routine
      </p>
    </section>
  );
}
