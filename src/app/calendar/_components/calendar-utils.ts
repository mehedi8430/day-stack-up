import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  min,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { getMonthDays, getWeek, getWeekDays, shiftWeek } from "@/lib/date";

export type CalendarView = "week" | "month" | "last15";

export interface CalendarRange {
  days: Date[];
  progressDays: Date[];
  previousDays: Date[];
  isFuture: boolean;
}

export interface RangeLabels {
  rangeLabel: string;
  rangeNoun: string;
  comparisonLabel: string;
}

export function getRollingDays(end: Date, count: number): Date[] {
  const endDay = startOfDay(end);
  return eachDayOfInterval({
    start: subDays(endDay, count - 1),
    end: endDay,
  });
}

export function getMonthProgressRange(monthCursor: Date, today: Date) {
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const currentMonthStart = startOfMonth(today);

  if (monthStart > currentMonthStart) {
    return { current: [], previous: [], isFuture: true };
  }

  const isCurrentMonth = isSameMonth(monthCursor, today);
  const currentEnd = isCurrentMonth ? min([today, monthEnd]) : monthEnd;
  const current = eachDayOfInterval({ start: monthStart, end: currentEnd });

  const previousStart = startOfMonth(subMonths(monthStart, 1));
  const previousMonthEnd = endOfMonth(previousStart);
  const previousEnd = isCurrentMonth
    ? min([addDays(previousStart, current.length - 1), previousMonthEnd])
    : previousMonthEnd;

  return {
    current,
    previous: eachDayOfInterval({ start: previousStart, end: previousEnd }),
    isFuture: false,
  };
}

export function getCalendarRange({
  view,
  cursor,
  weekStart,
  rollingEnd,
  today,
}: {
  view: CalendarView;
  cursor: Date;
  weekStart: Date;
  rollingEnd: Date;
  today: Date;
}): CalendarRange {
  if (view === "week") {
    const weekDays = getWeekDays(weekStart);
    const currentWeekStart = getWeek(today).start;

    if (weekStart.getTime() > currentWeekStart.getTime()) {
      return {
        days: weekDays,
        progressDays: [],
        previousDays: [],
        isFuture: true,
      };
    }

    const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();
    const progressDays = isCurrentWeek
      ? weekDays.filter((day) => day <= today)
      : weekDays;
    const previousWeekDays = getWeekDays(shiftWeek(weekStart, -1));

    return {
      days: weekDays,
      progressDays,
      previousDays: isCurrentWeek
        ? previousWeekDays.slice(0, progressDays.length)
        : previousWeekDays,
      isFuture: false,
    };
  }

  if (view === "last15") {
    const rollingDays = getRollingDays(rollingEnd, 15);
    const progressDays = rollingDays.filter((day) => day <= today);

    if (progressDays.length === 0) {
      return {
        days: rollingDays,
        progressDays: [],
        previousDays: [],
        isFuture: true,
      };
    }

    return {
      days: rollingDays,
      progressDays,
      previousDays: getRollingDays(
        subDays(rollingDays[0], 1),
        progressDays.length,
      ),
      isFuture: false,
    };
  }

  const monthProgress = getMonthProgressRange(cursor, today);
  return {
    days: getMonthDays(cursor.getFullYear(), cursor.getMonth()),
    progressDays: monthProgress.current,
    previousDays: monthProgress.previous,
    isFuture: monthProgress.isFuture,
  };
}

export function getRangeLabels({
  view,
  cursor,
  weekStart,
  days,
}: {
  view: CalendarView;
  cursor: Date;
  weekStart: Date;
  days: Date[];
}): RangeLabels {
  const monthLabel = format(cursor, "MMMM yyyy");
  const week = getWeek(weekStart);
  const weekLabel = `${format(week.start, "MMM d")} – ${format(
    week.end,
    "MMM d, yyyy",
  )}`;
  const rollingLabel =
    view === "last15" && days.length > 0
      ? `${format(days[0], "MMM d")} – ${format(
          days[days.length - 1],
          "MMM d, yyyy",
        )}`
      : "";
  const rangeLabel =
    view === "month" ? monthLabel : view === "week" ? weekLabel : rollingLabel;
  const rangeNoun =
    view === "month" ? "month" : view === "week" ? "week" : "15 days";
  const comparisonLabel =
    view === "week"
      ? "the week before"
      : view === "last15"
        ? "the previous 15 days"
        : "the month before";

  return { rangeLabel, rangeNoun, comparisonLabel };
}
