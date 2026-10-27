"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowDown, ArrowUp, Flame, Minus, Trophy } from "lucide-react";
import { Habit, getCategory } from "@/lib/types";

export interface StreakRow {
  habit: Habit;
  current: number;
  best: number;
}

interface StreaksPanelProps {
  streaks: StreakRow[];
}

interface StreakSummaryProps {
  streaks: StreakRow[];
  consistency: number | null;
  consistencyTrend: "up" | "down" | "same" | "na";
}

export function StreakSummary({
  streaks,
  consistency,
  consistencyTrend,
}: StreakSummaryProps) {
  const bestCurrent = streaks.reduce<StreakRow | null>(
    (best, row) => (!best || row.current > best.current ? row : best),
    null,
  );
  const bestEver = streaks.reduce<StreakRow | null>(
    (best, row) => (!best || row.best > best.best ? row : best),
    null,
  );
  const TrendIcon =
    consistencyTrend === "up"
      ? ArrowUp
      : consistencyTrend === "down"
        ? ArrowDown
        : Minus;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Streaks</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Flame className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Current streak</p>
              <p className="text-lg font-semibold">
                {bestCurrent?.current ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  days
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {bestCurrent?.current
                  ? bestCurrent.habit.name
                  : "Complete a habit to start"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Trophy className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Best ever</p>
              <p className="text-lg font-semibold">
                {bestEver?.best ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  days
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {bestEver?.best ? bestEver.habit.name : "No streaks yet"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <TrendIcon className="h-4 w-4" />
            </span>
            Consistency (30 days)
          </CardDescription>
          <CardTitle className="flex items-center gap-1 text-2xl">
            {consistency === null ? "N/A" : `${Math.round(consistency)}%`}
            {consistency !== null && consistencyTrend !== "na" && (
              <TrendIcon
                className={`h-4 w-4 ${
                  consistencyTrend === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : consistencyTrend === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                }`}
                aria-label={`Consistency trend ${consistencyTrend}`}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Compared with the previous 30 days
        </CardContent>
      </Card>
    </div>
  );
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