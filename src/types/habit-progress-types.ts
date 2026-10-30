import type { AchievementLevel } from "@/lib/date";

export type ProgressPeriodView = "week" | "month";

export interface ProgressHabit {
  id: string;
  name: string;
  emoji?: string;
  category: string;
  createdAt: string;
  /** Days per week this habit targets (1-7). 7 = every day. */
  weeklyTarget: number;
}

/** One effective-dated schedule row, serialized for the client. */
export interface HabitScheduleRow {
  habit_id: string;
  /** Inclusive first date this target applies to, "yyyy-mm-dd". */
  starts_on: string;
  weekly_target: number;
}

/** habitId -> that habit's schedule rows, sorted by starts_on ascending. */
export type ScheduleTimelines = Record<string, HabitScheduleRow[]>;

export interface ProgressPeriod {
  view: ProgressPeriodView;
  /** First calendar day of the period. */
  start: Date;
  /** Last calendar day of the period, including future dates. */
  end: Date;
  /** Last day completions are counted for (today while in progress). */
  effectiveEnd: Date;
  totalDays: number;
  /** Calendar days from the start through the effective end. Zero for a future period. */
  elapsedDays: number;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface PeriodMetric {
  completed: number;
  /**
   * Period target: the sum of each eligible date's share of the weekly
   * target (weeklyTarget / 7 per day). May be fractional, e.g. 22.1 for a
   * "5 days per week" habit across a 31-day month.
   */
  target: number;
  /** Raw percentage vs the target, or null when there is no target. May exceed 100. */
  percentage: number | null;
  level: AchievementLevel | null;
}

export type TrendDirection = "up" | "down" | "same" | "na";

export interface MetricComparison {
  /** Raw percentage-point difference, or null when either side has no data. */
  percentageDelta: number | null;
  /** Completed-day difference, or null when either side has no target. */
  completedDelta: number | null;
  trend: TrendDirection;
  completedTrend: TrendDirection;
  levelTrend: TrendDirection;
}

export type CompletionMap = Record<string, boolean>;

export interface RangeRateMetric {
  completed: number;
  target: number;
  /** Raw percentage vs the target, or null when nothing is eligible. */
  percentage: number | null;
}

export interface DoneCounter {
  /** Completions on the dates eligible for the habit. */
  completed: number;
  /**
   * Scheduled days for the range, rounded to a whole day ("5.6" -> 6), or
   * null when less than one day is scheduled (or the target is zero) so the
   * denominator is hidden.
   */
  scheduled: number | null;
  /** True when completions cover the rounded scheduled count. */
  complete: boolean;
}
