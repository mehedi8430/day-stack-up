"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatTargetCount } from "@/lib/habit-progress";

const HEATMAP_LEVELS = [
  "rgba(22,163,74,0.12)",
  "rgba(22,163,74,0.35)",
  "rgba(22,163,74,0.6)",
  "rgba(22,163,74,0.85)",
  "rgba(22,163,74,1)",
];

function heatColor(ratio: number): string {
  if (ratio <= 0) return "rgba(148,148,148,0.12)";
  const idx = Math.min(4, Math.ceil(ratio * 4));
  return HEATMAP_LEVELS[idx];
}

export interface HeatCell {
  date: string;
  label: string;
  ratio: number;
  done: number;
  total: number;
}

interface HeatmapProps {
  year: number;
  cells: HeatCell[];
}

export function Heatmap({ year, cells }: HeatmapProps) {
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yearly Heatmap</CardTitle>
        <CardDescription>
          Completion density per day for {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.label}: ${cell.done}/${formatTargetCount(cell.total)} target days completed`}
                    className="h-3.5 w-3.5 rounded-sm"
                    style={{ backgroundColor: heatColor(cell.ratio) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: heatColor(r) }}
            />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}