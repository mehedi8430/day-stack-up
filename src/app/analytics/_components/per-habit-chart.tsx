"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { chartTooltipStyle } from "./chart-common";

export interface PerHabitPoint {
  name: string;
  days: number;
  total: number;
  fill: string;
}

interface PerHabitChartProps {
  data: PerHabitPoint[];
  dayCount: number;
}

export function PerHabitChart({ data, dayCount }: PerHabitChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Per-Habit Completion</CardTitle>
        <CardDescription>
          How many days each habit was completed this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-115 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, dayCount]}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <RTooltip
                contentStyle={chartTooltipStyle}
                formatter={(value, _n, item) => [
                  `${Number(value)} / ${item?.payload?.total} days`,
                  "Completed",
                ]}
              />
              <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}