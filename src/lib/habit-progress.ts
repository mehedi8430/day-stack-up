import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  getLevel,
  toKey,
  type AchievementLevel,
} from "@/lib/date";

export type ProgressPeriodView = "week" | "month";

export interface ProgressHabit {
  id: string;
  name: string;
  emoji?: string;
  category: string;
  createdAt: string;
}

export interface ProgressPeriod {
  view: ProgressPeriodView;
  /** First calendar day of the period. */
  start: Date;
  /** Last calendar day of the period, including future dates. */
  end: Date;
  /** Last day included in calculations (today for the current period). */
  effectiveEnd: Date;
  totalDays: number;
  /** Calendar days included in calculations. Zero for a future period. */
  elapsedDays: number;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface PeriodMetric {
  completed: number;
  expected: number;
  /** Raw percentage, or null when there are no eligible scheduled days. */
  percentage: number | null;
  level: AchievementLevel | null;
}

export type TrendDirection = "up" | "down" | "same" | "na";

export interface MetricComparison {
  /** Raw percentage-point difference, or null when either side has no data. */
  percentageDelta: number | null;
  /** Completed-day difference, or null when either side has no eligible days. */
  completedDelta: number | null;
  trend: TrendDirection;
  completedTrend: TrendDirection;
  levelTrend: TrendDirection;
}

export type CompletionMap = Record<string, boolean>;

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export function completionKey(habitId: string, dateKey: string): string {
  return `${habitId}__${dateKey}`;
}

/**
 * Builds the lookup used by progress calculations. Completion rows are unique
 * per habit/day in the database, and false rows are ignored so they can never
 * inflate the numerator.
 */
export function buildCompletionMap(
  completions: { habit_id: string; date: string; completed: boolean }[],
): CompletionMap {
  const map: CompletionMap = {};
  for (const completion of completions) {
    if (!completion.completed) continue;
    map[completionKey(completion.habit_id, completion.date)] = true;
  }
  return map;
}

/**
 * Returns the selected week (Monday–Sunday) or calendar month.
 *
 * For the current period the effective end is today, so future dates are
 * excluded from both the numerator and denominator.
 */
export function getProgressPeriod(
  view: ProgressPeriodView,
  cursor: Date,
  today: Date,
): ProgressPeriod {
  const todayDay = startOfDay(today);
  const start =
    view === "week"
      ? startOfWeek(cursor, WEEK_OPTIONS)
      : startOfMonth(cursor);
  const end = view === "week" ? addDays(start, 6) : endOfMonth(start);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const isFuture = start.getTime() > todayDay.getTime();
  const isCurrent = !isFuture && todayDay.getTime() <= end.getTime();
  const effectiveEnd = isCurrent ? todayDay : end;
  const elapsedDays = isFuture
    ? 0
    : differenceInCalendarDays(effectiveEnd, start) + 1;

  return {
    view,
    start,
    end,
    effectiveEnd,
    totalDays,
    elapsedDays,
    isCurrent,
    isFuture,
  };
}

/**
 * Returns the comparison period. When the selected period is in progress the
 * previous period is clipped to the same number of elapsed calendar days, so a
 * part-month is never compared with a full month (or a part-week with a full
 * week).
 */
export function getPreviousProgressPeriod(
  current: ProgressPeriod,
): ProgressPeriod {
  const start =
    current.view === "week"
      ? addDays(current.start, -7)
      : startOfMonth(addMonths(current.start, -1));
  const end =
    current.view === "week" ? addDays(start, 6) : endOfMonth(start);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const elapsedDays = current.isFuture
    ? 0
    : current.isCurrent
      ? Math.min(current.elapsedDays, totalDays)
      : totalDays;
  const effectiveEnd =
    elapsedDays === 0 ? start : addDays(start, elapsedDays - 1);

  return {
    view: current.view,
    start,
    end,
    effectiveEnd,
    totalDays,
    elapsedDays,
    isCurrent: false,
    isFuture: false,
  };
}

/**
 * DayStackUp currently has no per-habit frequency or archive fields: a habit is
 * scheduled every day from the date it was created. This single predicate is
 * the place to extend if an explicit schedule model is added later.
 *
 * Historical note: because schedules are not stored, there is no schedule
 * history to replay. The daily model above is exact for the current schema;
 * adding frequency changes would require persisting effective-dated schedules.
 */
export function isHabitScheduledOn(
  habit: Pick<ProgressHabit, "createdAt">,
  date: Date,
): boolean {
  // Compare date-only keys so server and browser renders agree regardless of
  // their timezones. Completion keys are date-only strings for the same reason.
  const createdOn = habit.createdAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) return true;
  return toKey(date) >= createdOn;
}

export function computeHabitPeriodMetric(
  habit: ProgressHabit,
  completions: CompletionMap,
  period: ProgressPeriod,
): PeriodMetric {
  if (period.elapsedDays <= 0) {
    return { completed: 0, expected: 0, percentage: null, level: null };
  }

  const days = eachDayOfInterval({
    start: period.start,
    end: period.effectiveEnd,
  });

  let expected = 0;
  let completed = 0;

  for (const day of days) {
    if (!isHabitScheduledOn(habit, day)) continue;

    expected += 1;
    if (completions[completionKey(habit.id, toKey(day))]) {
      completed += 1;
    }
  }

  const percentage = expected === 0 ? null : (completed / expected) * 100;

  return {
    completed,
    expected,
    percentage,
    level: percentage === null ? null : getLevel(percentage),
  };
}

/** Pools all eligible habit-days into one overall completion rate. */
export function summarizeMetrics(metrics: PeriodMetric[]): PeriodMetric {
  let expected = 0;
  let completed = 0;

  for (const metric of metrics) {
    expected += metric.expected;
    completed += metric.completed;
  }

  const percentage = expected === 0 ? null : (completed / expected) * 100;

  return {
    completed,
    expected,
    percentage,
    level: percentage === null ? null : getLevel(percentage),
  };
}

function directionFor(delta: number): TrendDirection {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded > 0) return "up";
  if (rounded < 0) return "down";
  return "same";
}

export function compareMetrics(
  current: PeriodMetric,
  previous: PeriodMetric,
): MetricComparison {
  const percentageDelta =
    current.percentage !== null && previous.percentage !== null
      ? current.percentage - previous.percentage
      : null;
  const completedDelta =
    current.expected > 0 && previous.expected > 0
      ? current.completed - previous.completed
      : null;

  return {
    percentageDelta,
    completedDelta,
    trend: percentageDelta === null ? "na" : directionFor(percentageDelta),
    completedTrend:
      completedDelta === null ? "na" : directionFor(completedDelta),
    levelTrend:
      current.level && previous.level
        ? directionFor(current.level.rank - previous.level.rank)
        : "na",
  };
}
