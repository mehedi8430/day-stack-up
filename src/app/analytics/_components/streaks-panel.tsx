"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Flame, Trophy } from "lucide-react";
import { Habit, getCategory } from "@/lib/types";

export interface StreakRow {
  habit: Habit;
  current: number;
  best: number;
}

interface StreaksPanelProps {
  streaks: StreakRow[];
}

export function StreaksPanel({ streaks }: StreaksPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" /> Streaks by habit
        </CardTitle>
        <CardDescription>
          Current and best consecutive-day streaks across each habit&apos;s history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {streaks.map((s) => {
            const cat = getCategory(s.habit.category);
            return (
              <div
                key={s.habit.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="max-w-[120px] truncate text-sm font-medium">
                    {s.habit.name}
                  </span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className="flex items-center gap-1"
                    title="Current streak"
                  >
                    🔥 {s.current}
                  </span>
                  <span
                    className="flex items-center gap-1 text-muted-foreground"
                    title="Best streak"
                  >
                    <Trophy className="h-3.5 w-3.5" /> {s.best}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}