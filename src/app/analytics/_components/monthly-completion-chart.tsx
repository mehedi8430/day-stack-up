"use client";

import {
  BarChart,
  Bar,
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

export interface MonthlyCompletionPoint {
  month: string;
  score: number | null;
}

interface MonthlyCompletionChartProps {
  data: MonthlyCompletionPoint[];
}

export function MonthlyCompletionChart({ data }: MonthlyCompletionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Completion</CardTitle>
        <CardDescription>
          Completion compared with each month&apos;s eligible target
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -10, right: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
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
                  "Completion",
                ]}
              />
              <Bar
                dataKey="score"
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}