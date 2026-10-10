import type { PlannerTask } from "./planner-types";

export function sortPlannerTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.startTime && !b.startTime) return a.position - b.position;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime) || a.position - b.position;
  });
}
