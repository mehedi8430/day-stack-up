import type { PlannerTask } from "./planner-types";

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
export function formatPlannedDuration(minutes: number): string {
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
