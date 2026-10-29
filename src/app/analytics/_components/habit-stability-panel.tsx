"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategory, type Habit } from "@/lib/types";
import type { HabitStability } from "@/lib/habit-analytics";
import * as React from "react";

export interface HabitStabilityRow {
  habit: Habit;
  stability: HabitStability;
}

interface HabitStabilityPanelProps {
  rows: HabitStabilityRow[];
}

const levelLabels: Record<HabitStability["level"], string> = {
  high: "High Stability",
  moderate: "Moderate Stability",
  low: "Low Stability",
  building: "Building",
  inactive: "No Activity",
};

const levelStyles: Record<HabitStability["level"], string> = {
  high: "border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  moderate:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  low: "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  building:
    "border-muted bg-muted text-muted-foreground",
  inactive:
    "border-muted bg-muted text-muted-foreground",
};

function StabilitySparkline({
  name,
  values,
  color,
}: {
  name: string;
  values: number[];
  color: string;
}) {
  const width = 280;
  const height = 54;
  const padding = 4;
  if (values.length === 0) {
    return (
      <div className="flex h-[54px] items-center text-xs text-muted-foreground">
        No completed weeks to chart yet
      </div>
    );
  }

  const min = Math.max(0, Math.min(...values) - 1);
  const max = Math.min(7, Math.max(...values) + 1);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x:
      values.length < 2
        ? width / 2
        : padding + (index / (values.length - 1)) * (width - padding * 2),
    y: height - padding - ((value - min) / range) * (height - padding * 2),
  }));
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg
      className="h-[54px] w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${name}: weekly completion counts ${values.join(", ")}`}
    >
      <path d={area} fill={color} fillOpacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HabitStabilityPanel({ rows }: HabitStabilityPanelProps) {
  const [selectedHabitId, setSelectedHabitId] = React.useState(
    () => rows[0]?.habit.id ?? "",
  );
  const selectedRow =
    rows.find(({ habit }) => habit.id === selectedHabitId) ?? rows[0];

  if (!selectedRow) return null;

  const { habit, stability } = selectedRow;
  const category = getCategory(habit.category);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle>Habit Stability</CardTitle>
          <CardDescription className="mt-2">
            Variation in completion frequency over the last 12 completed weeks
          </CardDescription>
        </div>
        <Select value={habit.id} onValueChange={setSelectedHabitId}>
          <SelectTrigger
            aria-label="Select a habit to view stability"
            className="w-[min(11rem,45%)] shrink-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rows.map(({ habit: option }) => (
              <SelectItem key={option.id} value={option.id}>
                {option.emoji ? `${option.emoji} ` : ""}
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 dark:border-green-900 dark:bg-green-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {habit.emoji && (
                <span aria-hidden="true" className="shrink-0">
                  {habit.emoji}
                </span>
              )}
              <span className="truncate text-sm font-semibold">
                {habit.name}
              </span>
            </div>
            <span
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${levelStyles[stability.level]}`}
            >
              {levelLabels[stability.level]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              Weekly completions
            </span>
            <span className="text-muted-foreground">
              {stability.min === null || stability.max === null
                ? "Range: —"
                : `Range: ${stability.min} - ${stability.max} (${stability.variation} variation)`}
            </span>
          </div>

          <div className="mt-2">
            <StabilitySparkline
              name={habit.name}
              values={stability.weeklyCompletions}
              color={category.color}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
