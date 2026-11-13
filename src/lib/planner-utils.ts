import type { PlannerTask } from "./planner-types";

/**
 * Converts a planner "HH:mm" value into a Date anchored at 1970-01-01 UTC.
 *
 * `daily_planner_tasks.start_time` is a PostgreSQL `TIME` column with no
 * timezone. Anchoring the value in UTC keeps it a plain wall-clock time and
 * stops the server's local timezone from shifting it between write and read.
 */
export function parsePlannerTime(value: string): Date | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value);
  if (!match) return null;

  return new Date(
    Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2])),
  );
}

/** Formats a planner time Date back to "HH:mm" using its UTC wall clock. */
export function formatPlannerTime(value: Date): string {
  const hours = value.getUTCHours().toString().padStart(2, "0");
  const minutes = value.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function sortPlannerTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.startTime && !b.startTime) return a.position - b.position;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime) || a.position - b.position;
  });
}

/**
 * Formats a minute total as a human-readable duration, e.g. 130 -> "2 hrs
 * 10 minutes" and 45 -> "45 minutes".
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainingMinutes = total % 60;

  if (hours === 0) {
    return `${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
  }

  const hourLabel = `${hours} hr${hours === 1 ? "" : "s"}`;
  if (remainingMinutes === 0) return hourLabel;

  return `${hourLabel} ${remainingMinutes} min`;
}
