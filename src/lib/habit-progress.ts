import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { getLevel, getWeek, shiftWeek, toKey } from "@/lib/date";
import type {
  CompletionMap,
  DoneCounter,
  HabitScheduleRow,
  MetricComparison,
  PeriodMetric,
  ProgressHabit,
  ProgressPeriod,
  ProgressPeriodView,
  RangeRateMetric,
  ScheduleTimelines,
  TrendDirection,
} from "@/types/habit-progress-types";

/** The unit every weekly target is expressed in. */
export const DAYS_PER_WEEK = 7;

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
 * Returns the selected Saturday-to-Friday week or calendar month.
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
  const week = view === "week" ? getWeek(cursor) : null;
  const start = week ? week.start : startOfMonth(cursor);
  const end = week ? week.end : endOfMonth(start);
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
  const week =
    current.view === "week"
      ? getWeek(shiftWeek(current.start, -1))
      : null;
  const start = week ? week.start : startOfMonth(addMonths(current.start, -1));
  const end = week ? week.end : endOfMonth(start);
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
 * Target-aware achieved-so-far rate for an arbitrary list of dates. The home
 * calendar's progress bar uses this over its elapsed/visible range so it
 * respects each habit's weekly target, creation date, and schedule history
 * instead of assuming every habit is due every day.
 *
 * Callers pass the dates that count as "so far" (elapsed days for the current
 * range, the full range for past periods); future days are not weighted.
 */
export function computeRangeRate(
  habits: ProgressHabit[],
  timelines: ScheduleTimelines,
  completions: CompletionMap,
  days: Date[],
): RangeRateMetric {
  let completed = 0;
  let target = 0;

  for (const habit of habits) {
    for (const day of days) {
      if (!isHabitEligibleOn(habit, day)) continue;

      const key = toKey(day);
      if (completions[completionKey(habit.id, key)] === true) {
        completed += 1;
      }
      target += resolveWeeklyTarget(habit, timelines, key) / DAYS_PER_WEEK;
    }
  }

  return {
    completed,
    target,
    percentage: target <= 0 ? null : (completed / target) * 100,
  };
}

/**
 * Formats a possibly fractional target count: 31 -> "31", 22.142857 -> "22.1".
 */
export function formatTargetCount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Scheduled days for an arbitrary range using the habit's **current** weekly
 * target. The calendar's per-habit counter is a glance at the current routine,
 * so it deliberately ignores `habit_schedules` history: a habit that moved
 * from daily to 5 days/week shows the 5 days/week goal for the whole visible
 * range instead of a blend of old and new targets. Creation dates still trim
 * the range so a habit is never measured before it existed.
 *
 * The progress page's history-aware math lives in `computeHabitPeriodMetric`
 * and is unchanged.
 */
export function scheduledDaysForRange(
  habit: Pick<ProgressHabit, "createdAt" | "weeklyTarget">,
  days: Date[],
): number {
  const share = sanitizeWeeklyTarget(habit.weeklyTarget) / DAYS_PER_WEEK;
  let scheduled = 0;
  for (const day of days) {
    if (isHabitEligibleOn(habit, day)) scheduled += share;
  }
  return scheduled;
}

/**
 * Per-habit "done / scheduled days" counter values for the calendar's end
 * column. Built from the rate over the visible range. The scheduled count is
 * rounded to whole days, and the green coverage check uses that same rounded
 * number so the display and the color always agree.
 *
 * `scheduledDaysOverride` pins the scheduled count to a known goal (the
 * calendar passes the habit's current weekly target for the week view and
 * `scheduledDaysForRange` for month / last-15 views). Callers that omit it
 * fall back to the target carried by the rate.
 */
export function doneCounterFrom(
  rate: RangeRateMetric,
  scheduledDaysOverride?: number | null,
): DoneCounter {
  const scheduled = Math.round(scheduledDaysOverride ?? rate.target);
  return {
    completed: rate.completed,
    scheduled: scheduled >= 1 ? scheduled : null,
    complete: scheduled >= 1 && rate.completed >= scheduled,
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
