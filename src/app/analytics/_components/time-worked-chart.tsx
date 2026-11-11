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
import { buildTimeWorkedData } from "@/lib/time-worked";
import { PlannerTask } from "@/lib/planner-types";
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

interface TimeWorkedChartProps {
  view: AnalyticsView;
  yearCursor: number;
  days: Date[];
  tasks: PlannerTask[];
}

export function TimeWorkedChart({ view, yearCursor, days, tasks }: TimeWorkedChartProps) {
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
      ? `Hours of completed planner tasks in each month of ${yearCursor}`
      : view === "week"
        ? "Hours of completed planner tasks per day this week"
        : monthGranularity === "week"
          ? "Hours of completed planner tasks per Saturday–Friday week"
          : "Hours of completed planner tasks per day this month";

  const xAxisKey =
    view === "year" ? "month" : isMonthWeekView ? "week" : "date";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Time Worked</CardTitle>
            <CardDescription>{description}</CardDescription>
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
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
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
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
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