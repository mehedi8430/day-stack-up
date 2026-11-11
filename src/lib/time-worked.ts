import { format } from "date-fns";
import { formatDayShort, getMonthBuckets, getWeekChunks, toKey } from "@/lib/date";
import type { PlannerTask } from "@/lib/planner-types";

const WORKED_STATUSES = ["done", "in_progress"];

export type TimeWorkedGranularity = "day" | "week";

export interface TimeWorkedPoint {
  date?: string;
  month?: string;
  week?: string;
  full: string;
  hours: number;
  mins: number;
}

interface BuildTimeWorkedDataArgs {
  view: "month" | "week" | "year";
  yearCursor: number;
  days: Date[];
  tasks: PlannerTask[];
  monthGranularity?: TimeWorkedGranularity;
}

function workedMinutes(tasks: PlannerTask[], date: string): number {
  return tasks
    .filter(
      (t) =>
        t.date === date &&
        t.durationMinutes &&
        WORKED_STATUSES.includes(t.status),
    )
    .reduce((sum, t) => sum + (t.durationMinutes ?? 0), 0);
}

function toHours(mins: number): number {
  return Math.round((mins / 60) * 10) / 10;
}

function point(full: string, mins: number): TimeWorkedPoint {
  return { full, hours: toHours(mins), mins };
}

export function buildTimeWorkedData({
  view,
  yearCursor,
  days,
  tasks,
  monthGranularity = "week",
}: BuildTimeWorkedDataArgs): TimeWorkedPoint[] {
  if (view === "year") {
    return getMonthBuckets(yearCursor).map((monthDays, m) => {
      const mins = monthDays.reduce(
        (sum, d) => sum + workedMinutes(tasks, toKey(d)),
        0,
      );
      return {
        ...point(format(new Date(yearCursor, m, 1), "MMMM yyyy"), mins),
        month: format(new Date(yearCursor, m, 1), "MMM"),
      };
    });
  }

  if (view === "month" && monthGranularity === "week") {
    // Saturday-start weeks that overlap the month; each bar counts only
    // the month's days inside its week, so bars still sum to the month.
    return getWeekChunks(days).map((chunk) => {
      const weekStart = chunk[0];
      const mins = chunk.reduce(
        (sum, d) => sum + workedMinutes(tasks, toKey(d)),
        0,
      );
      return {
        ...point(
          `${format(weekStart, "MMM d")}–${format(
            chunk[chunk.length - 1],
            "MMM d",
          )} (days in this month)`,
          mins,
        ),
        week: format(weekStart, "MMM d"),
      };
    });
  }

  return days.map((d) => {
    const mins = workedMinutes(tasks, toKey(d));
    return {
      ...point(format(d, "MMM d"), mins),
      date: formatDayShort(d),
    };
  });
}
