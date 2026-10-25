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

/** The unit every weekly target is expressed in. */
export const DAYS_PER_WEEK = 7;

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

/**
 * Defends the math against corrupt/legacy schedule data. Values outside
 * 0-7 fall back to the daily default (7); a true zero survives and renders
 * as N/A instead of silently being relabelled.
 */
export function sanitizeWeeklyTarget(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 7;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > DAYS_PER_WEEK) return 7;
  return rounded;
}

/**
 * Builds habitId -> rows sorted by starts_on from raw schedule rows. Actions
 * upsert at most one row per habit/day (unique (habit_id, starts_on)), but
 * the sort is still applied so resolution only ever sees ordered timelines.
 */
export function buildScheduleTimelines(
  schedules: HabitScheduleRow[],
): ScheduleTimelines {
  const timelines: ScheduleTimelines = {};
  for (const row of schedules) {
    const rows = (timelines[row.habit_id] ??= []);
    rows.push(row);
  }
  for (const rows of Object.values(timelines)) {
    rows.sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  }
  return timelines;
}

/**
 * Weekly target in effect on `dateKey`: the schedule row with the greatest
 * `starts_on` <= dateKey wins, so changing a target never rewrites history.
 * Without any covering row (legacy rows before the backfill) the habit's
 * current target is used as a safe fallback.
 */
export function resolveWeeklyTarget(
  habit: Pick<ProgressHabit, "id" | "weeklyTarget">,
  timelines: ScheduleTimelines,
  dateKey: string,
): number {
  const rows = timelines[habit.id];
  if (!rows || rows.length === 0 || dateKey < rows[0].starts_on) {
    return sanitizeWeeklyTarget(habit.weeklyTarget);
  }
  let target = rows[0].weekly_target;
  for (const row of rows) {
    if (row.starts_on > dateKey) break;
    target = row.weekly_target;
  }
  return sanitizeWeeklyTarget(target);
}

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

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export function completionKey(habitId: string, dateKey: string): string {
  return `${habitId}__${dateKey}`;
}

/**
 * Builds the lookup used by progress calculations. Completion rows are unique
 * per habit/day in the database, and false rows are ignored so they can never
 * inflate the numerator. Each completed date therefore counts exactly once.
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
 * Returns the selected week (Monday-Sunday) or calendar month.
 *
 * The current period keeps `effectiveEnd === today` for the completed count,
 * while its target spans the whole period so users always see progress
 * toward the full-period goal.
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
 * Returns the previous period for comparisons. v2 compares goal with goal, so
 * the previous period keeps its complete length (the elapsed-day clipping
 * used by the daily-only model is gone) and is measured against its own
 * full-period target. A not-yet-started period zeroes the elapsed days so
 * every comparison metric renders as N/A.
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
  const elapsedDays = current.isFuture ? 0 : totalDays;

  return {
    view: current.view,
    start,
    end,
    effectiveEnd: end,
    totalDays,
    elapsedDays,
    isCurrent: false,
    isFuture: false,
  };
}

/**
 * A habit is eligible for a calendar date from its creation date onwards.
 * Completion history before creation is not counted; later dates count toward
 * the period goal even while they are still in the future.
 *
 * Date-only keys are compared on both sides so server and browser renders
 * agree regardless of their timezones.
 */
export function isHabitEligibleOn(
  habit: Pick<ProgressHabit, "createdAt">,
  date: Date,
): boolean {
  const createdOn = habit.createdAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) return true;
  return toKey(date) >= createdOn;
}

/**
 * Goal-based metric for one habit and period.
 *
 * Denominator: the full period target, built from each eligible date's share
 * of the habit's weekly target (weeklyTarget / 7 per date). Eligibility
 * starts at the creation date, and mid-period target changes are replayed
 * from schedule history, so partial periods and historical edits stay fair.
 *
 * Numerator: completed dates through today only.
 *
 * The raw percentage may exceed 100% (overachievement) and is null when the
 * habit did not exist in the period or its target shares sum to zero.
 */
export function computeHabitPeriodMetric(
  habit: ProgressHabit,
  timelines: ScheduleTimelines,
  completions: CompletionMap,
  period: ProgressPeriod,
): PeriodMetric {
  if (period.isFuture || period.elapsedDays <= 0) {
    return { completed: 0, target: 0, percentage: null, level: null };
  }

  const days = eachDayOfInterval({ start: period.start, end: period.end });

  let target = 0;
  let completed = 0;

  for (const day of days) {
    if (!isHabitEligibleOn(habit, day)) continue;

    const key = toKey(day);
    if (
      day.getTime() <= period.effectiveEnd.getTime() &&
      completions[completionKey(habit.id, key)] === true
    ) {
      completed += 1;
    }

    target += resolveWeeklyTarget(habit, timelines, key) / DAYS_PER_WEEK;
  }

  const percentage = target <= 0 ? null : (completed / target) * 100;

  return {
    completed,
    target,
    percentage,
    level: percentage === null ? null : getLevel(percentage),
  };
}

/** Pools all habits into one overall rate against their combined targets. */
export function summarizeMetrics(metrics: PeriodMetric[]): PeriodMetric {
  let target = 0;
  let completed = 0;

  for (const metric of metrics) {
    target += metric.target;
    completed += metric.completed;
  }

  const percentage = target <= 0 ? null : (completed / target) * 100;

  return {
    completed,
    target,
    percentage,
    level: percentage === null ? null : getLevel(percentage),
  };
}

/**
 * Formats a possibly fractional target count: 31 -> "31", 22.142857 -> "22.1".
 */
export function formatTargetCount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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
    current.target > 0 && previous.target > 0
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
