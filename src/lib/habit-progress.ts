import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { getLevel, getWeek, toKey } from "@/lib/date";
import type {
  CompletionMap,
  DoneCounter,
  HabitScheduleRow,
  PeriodMetric,
  ProgressHabit,
  ProgressPeriod,
  ProgressPeriodView,
  RangeRateMetric,
  ScheduleTimelines,
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

/** A habit appears in a calendar range only if it existed on at least one day in it. */
export function isHabitEligibleInRange(
  habit: Pick<ProgressHabit, "createdAt">,
  days: Date[],
): boolean {
  return days.some((day) => isHabitEligibleOn(habit, day));
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

/** Weekly target effective on the first eligible date in a visible range. */
export function weeklyTargetForRange(
  habit: Pick<ProgressHabit, "id" | "createdAt" | "weeklyTarget">,
  timelines: ScheduleTimelines,
  days: Date[],
): number | null {
  const firstEligibleDay = days.find((day) => isHabitEligibleOn(habit, day));
  if (!firstEligibleDay) return null;
  return resolveWeeklyTarget(habit, timelines, toKey(firstEligibleDay));
}

/**
 * Formats a possibly fractional target count: 31 -> "31", 22.142857 -> "22.1".
 */
export function formatTargetCount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Per-habit "done / scheduled days" counter values for the calendar's end
 * column. The scheduled count is rounded to whole days, and the green coverage
 * check uses that same rounded number so the display and color agree.
 */
export function doneCounterFrom(
  rate: RangeRateMetric,
): DoneCounter {
  const scheduled = Math.round(rate.target);
  return {
    completed: rate.completed,
    scheduled: scheduled >= 1 ? scheduled : null,
    complete: scheduled >= 1 && rate.completed >= scheduled,
  };
}
