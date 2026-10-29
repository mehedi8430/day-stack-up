import {
  addDays,
  format,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";

export function toKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export interface Week {
  /** First day of the week: always a Saturday. */
  start: Date;
  /** Last day of the week: always the Friday six days after `start`. */
  end: Date;
}

/**
 * Weeks run Saturday to Friday and are independent of months: the week
 * containing `date` is the calendar week whose Saturday is on or before it.
 * Every week covers exactly seven days, so a week can span a month boundary.
 */
export function getWeek(date: Date): Week {
  const start = startOfWeek(startOfDay(date), { weekStartsOn: 6 });
  return { start, end: addDays(start, 6) };
}

/** Every calendar day in the Saturday-start week containing `date` (7 days). */
export function getWeekDays(date: Date): Date[] {
  const { start, end } = getWeek(date);
  return eachDayOfInterval({ start, end });
}

/**
 * Moves `offset` whole weeks from `date`, crossing month and year boundaries
 * freely: weeks walk seven days at a time and no week is ever shortened.
 */
export function shiftWeek(date: Date, offset: number): Date {
  return addDays(getWeek(date).start, offset * 7);
}

/**
 * Groups consecutive calendar days into their Saturday-start weeks, keeping
 * only the days that fall inside the given list. The chunks partition the
 * list exactly (every day appears once) and each chunk is the intersection
 * of a global Sat-Fri week with the listed days.
 */
export function getWeekChunks(days: Date[]): Date[][] {
  const chunks: Date[][] = [];
  let currentKey = "";

  for (const day of days) {
    const key = toKey(getWeek(day).start);
    const current = chunks[chunks.length - 1];
    if (!current || key !== currentKey) {
      chunks.push([day]);
      currentKey = key;
    } else {
      current.push(day);
    }
  }

  return chunks;
}

export function getMonthDays(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export function getYearDays(year: number): Date[] {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(start);
  return eachDayOfInterval({ start, end });
}

export function getMonthBuckets(year: number): Date[][] {
  return Array.from({ length: 12 }, (_, m) =>
    getMonthDays(year, m)
  );
}

export function formatDayShort(date: Date): string {
  return format(date, "EEE d");
}

export function formatFullDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

export function monthlyAverageScore(
  completions: Record<string, boolean>,
  habits: { id: string }[],
  days: Date[]
): number {
  if (habits.length === 0 || days.length === 0) return 0;
  const total = habits.length * days.length;
  let done = 0;
  for (const day of days) {
    const key = toKey(day);
    for (const h of habits) {
      if (completions[`${h.id}__${key}`]) done += 1;
    }
  }
  return total === 0 ? 0 : (done / total) * 100;
}

export function yearlyCompletionRatio(
  completions: Record<string, boolean>,
  habits: { id: string }[],
  year: number
): number {
  const days = getYearDays(year);
  if (habits.length === 0 || days.length === 0) return 0;
  let total = 0;
  let done = 0;
  for (const day of days) {
    const key = toKey(day);
    for (const h of habits) {
      total += 1;
      if (completions[`${h.id}__${key}`]) done += 1;
    }
  }
  return total === 0 ? 0 : (done / total) * 100;
}

export interface AchievementLevel {
  label: string;
  color: string;
  minScore: number;
  rank: number;
}

/**
 * The app's achievement/OKR thresholds. Keep these as the single source of
 * truth for level labels, colors, and ordering.
 */
export const ACHIEVEMENT_LEVELS: AchievementLevel[] = [
  { label: "Legendary", color: "#eab308", minScore: 90, rank: 4 },
  { label: "Elite", color: "#a855f7", minScore: 75, rank: 3 },
  { label: "Advanced", color: "#3b82f6", minScore: 60, rank: 2 },
  { label: "Intermediate", color: "#22c55e", minScore: 40, rank: 1 },
  { label: "Beginner", color: "#9ca3af", minScore: 0, rank: 0 },
];

export function getLevel(score: number): AchievementLevel {
  return (
    ACHIEVEMENT_LEVELS.find((level) => score >= level.minScore) ??
    ACHIEVEMENT_LEVELS[ACHIEVEMENT_LEVELS.length - 1]
  );
}

export interface StreakInfo {
  current: number;
  best: number;
}

export function computeStreaks(
  habitId: string,
  completions: Record<string, boolean>,
  days: Date[]
): StreakInfo {
  let best = 0;
  let run = 0;
  let current = 0;

  // iterate chronologically
  const sorted = [...days].sort((a, b) => a.getTime() - b.getTime());

  for (const day of sorted) {
    const done = !!completions[`${habitId}__${toKey(day)}`];
    if (done) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // current streak: count backwards from the last day (or today)
  const ref = sorted[sorted.length - 1];
  if (ref) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      const done = !!completions[`${habitId}__${toKey(sorted[i])}`];
      if (done) current += 1;
      else break;
    }
  }

  return { current, best };
}
