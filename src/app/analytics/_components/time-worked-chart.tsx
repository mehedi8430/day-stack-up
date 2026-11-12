"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildTimeWorkedData,
  getActualWorkedMinutes,
} from "@/lib/time-worked";
import { getYearDays, toKey } from "@/lib/date";
import type { PlannerTask } from "@/lib/planner-types";
import { chartTooltipStyle } from "./chart-common";
import {
  AnalyticsView,
  TimeWorkedGranularity,
  TimeWorkedPoint,
} from "./analytics-types";

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const DAILY_TARGET_MINUTES = 8 * 60;
const WEEKLY_TARGET_MINUTES = 40 * 60;
const WEEKLY_TARGET_DAYS = 5;

interface TimeWorkedChartProps {
  view: AnalyticsView;
  yearCursor: number;
  days: Date[];
  tasks: PlannerTask[];
  today: Date;
}

export function TimeWorkedChart({
  view,
  yearCursor,
  days,
  tasks,
  today,
}: TimeWorkedChartProps) {
  const [chartType, setChartType] = React.useState<"bar" | "line">("bar");
  const [monthGranularity, setMonthGranularity] =
    React.useState<TimeWorkedGranularity>("week");
  const isMonthView = view === "month";
  const isMonthWeekView = isMonthView && monthGranularity === "week";

  const data: TimeWorkedPoint[] = React.useMemo(
    () =>
      buildTimeWorkedData({
        view,
        yearCursor,
        days,
        tasks,
        monthGranularity,
      }),
    [view, yearCursor, days, tasks, monthGranularity],
  );

  const description =
    view === "year"
      ? `Logged actual hours in each month of ${yearCursor}`
      : view === "week"
        ? "Logged actual hours per day this Saturday–Friday week"
        : monthGranularity === "week"
          ? "Logged actual hours per Saturday–Friday week"
          : "Logged actual hours per day this month";

  const xAxisKey =
    view === "year" ? "month" : isMonthWeekView ? "week" : "date";
  const todayKey = toKey(today);
  const periodDays = view === "year" ? getYearDays(yearCursor) : days;
  const elapsedDays = periodDays.filter((day) => toKey(day) <= todayKey);
  const totalMinutes = elapsedDays.reduce(
    (total, day) => total + getActualWorkedMinutes(tasks, toKey(day)),
    0,
  );
  const loggedDays = elapsedDays.filter(
    (day) => getActualWorkedMinutes(tasks, toKey(day)) > 0,
  ).length;
  const qualifyingDays = elapsedDays.filter(
    (day) =>
      getActualWorkedMinutes(tasks, toKey(day)) >= DAILY_TARGET_MINUTES,
  ).length;
  const averageMinutesPerLoggedDay =
    loggedDays > 0 ? Math.round(totalMinutes / loggedDays) : 0;
  const todayMinutes = getActualWorkedMinutes(tasks, todayKey);
  const hasToday = periodDays.some((day) => toKey(day) === todayKey);
  const isFuturePeriod =
    periodDays.length > 0 && toKey(periodDays[0]) > todayKey;
  const bestDayMinutes = elapsedDays.reduce(
    (best, day) =>
      Math.max(best, getActualWorkedMinutes(tasks, toKey(day))),
    0,
  );
  const dailyDisplayMinutes = hasToday ? todayMinutes : bestDayMinutes;
  const weeklyHoursPercentage = Math.min(
    100,
    (totalMinutes / WEEKLY_TARGET_MINUTES) * 100,
  );
  const dailyPercentage = Math.min(
    100,
    (dailyDisplayMinutes / DAILY_TARGET_MINUTES) * 100,
  );
  const dailyGoalMessage =
    dailyDisplayMinutes >= DAILY_TARGET_MINUTES
      ? "Daily goal reached"
      : `${formatDuration(DAILY_TARGET_MINUTES - dailyDisplayMinutes)} to go`;
  const weeklyGoalMessage = isFuturePeriod
    ? "This week has not started yet"
    : qualifyingDays >= WEEKLY_TARGET_DAYS
      ? "Five-day minimum reached"
      : toKey(periodDays[periodDays.length - 1]) < todayKey
        ? "Week ended below the five-day minimum"
        : `${WEEKLY_TARGET_DAYS - qualifyingDays} more qualifying ${
            WEEKLY_TARGET_DAYS - qualifyingDays === 1 ? "day" : "days"
          } to go`;
  const showDailyGoalLine =
    view === "week" || (view === "month" && monthGranularity === "day");

  const progressBar = (value: number, label: string) => (
    <div
      className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${value}%` }}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Time Worked</CardTitle>
            <CardDescription>
              {description}. Task time starts unlogged and only counts after
              you record it in the task editor.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {isMonthView && (
              <Tabs
                value={monthGranularity}
                onValueChange={(v) =>
                  setMonthGranularity(v as TimeWorkedGranularity)
                }
              >
                <TabsList className="h-8 sm:h-10">
                  <TabsTrigger className="text-xs sm:text-sm px-2 sm:px-3" value="week">
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger className="text-xs sm:text-sm px-2 sm:px-3" value="day">
                    Daily
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as "bar" | "line")}>
              <TabsList className="h-8 sm:h-10">
                <TabsTrigger className="text-xs sm:text-sm px-2 sm:px-3" value="bar">Bar</TabsTrigger>
                <TabsTrigger className="text-xs sm:text-sm px-2 sm:px-3" value="line">Line</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === "week" ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {hasToday
                  ? "Today"
                  : isFuturePeriod
                    ? "Daily target"
                    : "Best day"}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatDuration(dailyDisplayMinutes)}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}/ 8h
                </span>
              </p>
              {progressBar(dailyPercentage, "Daily time goal progress")}
              <p className="mt-2 text-xs text-muted-foreground">
                {isFuturePeriod
                  ? "This week has not started yet"
                  : dailyGoalMessage}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Weekly time</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatDuration(totalMinutes)}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}/ 40h
                </span>
              </p>
              {progressBar(weeklyHoursPercentage, "Weekly time goal progress")}
              <p className="mt-2 text-xs text-muted-foreground">
                {isFuturePeriod ? "Weekly target" : "Saturday–Friday target"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Qualifying workdays
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {qualifyingDays}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}/ 5
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {weeklyGoalMessage}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {view === "year" ? "Time logged this year" : "Time logged"}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatDuration(totalMinutes)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">8-hour workdays</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {qualifyingDays}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Average per logged day
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatDuration(averageMinutesPerLoggedDay)}
              </p>
            </div>
          </div>
        )}
        <div className="h-75 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={data} margin={{ left: -10, right: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  domain={
                    showDailyGoalLine
                      ? [0, (max: number) => Math.max(8, Math.ceil(max))]
                      : undefined
                  }
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                {showDailyGoalLine && (
                  <ReferenceLine
                    y={8}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    label={{
                      value: "8h goal",
                      position: "insideTopRight",
                      fontSize: 11,
                    }}
                  />
                )}
                <RTooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value, _n, item) => [
                    formatDuration(item?.payload?.mins ?? 0),
                    "Time worked",
                  ]}
                  labelFormatter={(_l, payload) =>
                    (payload?.[0]?.payload?.full as string) ?? ""
                  }
                />
                <Bar
                  dataKey="hours"
                  radius={[4, 4, 0, 0]}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ left: -10, right: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  domain={
                    showDailyGoalLine
                      ? [0, (max: number) => Math.max(8, Math.ceil(max))]
                      : undefined
                  }
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                {showDailyGoalLine && (
                  <ReferenceLine
                    y={8}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    label={{
                      value: "8h goal",
                      position: "insideTopRight",
                      fontSize: 11,
                    }}
                  />
                )}
                <RTooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value, _n, item) => [
                    formatDuration(item?.payload?.mins ?? 0),
                    "Time worked",
                  ]}
                  labelFormatter={(_l, payload) =>
                    (payload?.[0]?.payload?.full as string) ?? ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}