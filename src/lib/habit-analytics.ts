import { addDays, eachDayOfInterval, startOfDay, startOfWeek } from "date-fns";
import { toKey } from "@/lib/date";
import { completionKey } from "@/lib/habit-progress";
import type {
  CompletionMap,
  ProgressHabit,
} from "@/types/habit-progress-types";

export type HabitStabilityLevel =
  | "high"
  | "moderate"
  | "low"
  | "building"
  | "inactive";

export interface HabitStability {
  weeklyCompletions: number[];
  min: number | null;
  max: number | null;
  variation: number | null;
  level: HabitStabilityLevel;
}

/**
 * Measures how much a habit's completion frequency varies across up to the
 * last 12 fully completed Saturday-to-Friday weeks. Partial creation weeks
 * and the current, incomplete week are excluded so each point is comparable.
 */
export function computeHabitStability(
  habit: Pick<ProgressHabit, "id" | "createdAt">,
  completions: CompletionMap,
  today: Date,
): HabitStability {
  const currentWeekStart = startOfWeek(startOfDay(today), { weekStartsOn: 6 });
  const createdOn = habit.createdAt.slice(0, 10);
  const weeklyCompletions: number[] = [];

  for (let weekIndex = 11; weekIndex >= 0; weekIndex -= 1) {
    const weekStart = addDays(currentWeekStart, -7 * (weekIndex + 1));
    const weekStartKey = toKey(weekStart);
    if (/^\d{4}-\d{2}-\d{2}$/.test(createdOn) && weekStartKey <= createdOn) {
      continue;
    }

    const weekEnd = addDays(weekStart, 6);
    let completed = 0;
    for (const day of eachDayOfInterval({ start: weekStart, end: weekEnd })) {
      if (completions[completionKey(habit.id, toKey(day))]) completed += 1;
    }
    weeklyCompletions.push(completed);
  }

  if (weeklyCompletions.length === 0) {
    return {
      weeklyCompletions,
      min: null,
      max: null,
      variation: null,
      level: "building",
    };
  }

  const min = Math.min(...weeklyCompletions);
  const max = Math.max(...weeklyCompletions);
  const variation = max - min;
  const mean =
    weeklyCompletions.reduce((sum, count) => sum + count, 0) /
    weeklyCompletions.length;
  const standardDeviation = Math.sqrt(
    weeklyCompletions.reduce(
      (sum, count) => sum + (count - mean) ** 2,
      0,
    ) / weeklyCompletions.length,
  );
  const level =
    weeklyCompletions.length < 4
      ? "building"
      : mean === 0
        ? "inactive"
        : standardDeviation <= 1.25
          ? "high"
          : standardDeviation <= 2.25
            ? "moderate"
            : "low";

  return { weeklyCompletions, min, max, variation, level };
}
