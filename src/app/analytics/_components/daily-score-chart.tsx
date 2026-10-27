"use client";

import {
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Score</CardTitle>
        <CardDescription>
          Completion compared with the eligible daily target
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
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
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}