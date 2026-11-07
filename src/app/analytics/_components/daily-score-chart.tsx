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
import { chartTooltipStyle } from "./chart-common";

export interface DailyScorePoint {
  date: string;
  full: string;
  score: number | null;
}

interface DailyScoreChartProps {
  data: DailyScorePoint[];
}

export function DailyScoreChart({ data }: DailyScoreChartProps) {
  const [chartType, setChartType] = React.useState<"bar" | "line">("bar");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Daily Score</CardTitle>
            <CardDescription>
              Completion compared with the eligible daily target
            </CardDescription>
          </div>
          <Tabs
            value={chartType}
            onValueChange={(value) => setChartType(value as "bar" | "line")}
          >
            <TabsList className="h-8 sm:h-10">
              <TabsTrigger
                className="px-2 text-xs sm:px-3 sm:text-sm"
                value="bar"
              >
                Bar
              </TabsTrigger>
              <TabsTrigger
                className="px-2 text-xs sm:px-3 sm:text-sm"
                value="line"
              >
                Line
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, "auto"]}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <RTooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [
                    value == null ? "N/A" : `${Number(value)}%`,
                    "Score",
                  ]}
                  labelFormatter={(_l, payload) =>
                    (payload?.[0]?.payload?.full as string) ?? ""
                  }
                />
                <Bar
                  dataKey="score"
                  radius={[4, 4, 0, 0]}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            ) : (
              <LineChart
                data={data}
                margin={{ left: -10, right: 10, top: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, "auto"]}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <RTooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [
                    value == null ? "N/A" : `${Number(value)}%`,
                    "Score",
                  ]}
                  labelFormatter={(_l, payload) =>
                    (payload?.[0]?.payload?.full as string) ?? ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
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