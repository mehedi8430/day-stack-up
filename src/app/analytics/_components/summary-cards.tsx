"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LevelBadge } from "@/components/level-badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { AchievementLevel } from "@/lib/date";
import { AnalyticsView } from "./analytics-types";

interface SummaryCardsProps {
  view: AnalyticsView;
  completion: number | null;
  habitCount: number;
  level: AchievementLevel | null;
  consistency: number | null;
  consistencyTrend: "up" | "down" | "same" | "na";
}

export function SummaryCards({
  view,
  completion,
  habitCount,
  level,
  consistency,
  consistencyTrend,
}: SummaryCardsProps) {
  const TrendIcon =
    consistencyTrend === "up"
      ? ArrowUp
      : consistencyTrend === "down"
        ? ArrowDown
        : Minus;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription>
              {view === "year"
                ? "Yearly Completion"
                : view === "week"
                  ? "Weekly Completion"
                  : "Monthly Completion"}
            </CardDescription>
            {level && <LevelBadge level={level} />}
          </div>
          <CardTitle className="text-3xl">
            {completion === null ? "N/A" : `${completion}%`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {view === "year"
              ? "of yearly target habit-days"
              : view === "week"
                ? "of weekly target habit-days"
                : "of monthly target habit-days"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>30-day consistency</CardDescription>
          <CardTitle className="flex items-center gap-2 text-3xl">
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
        <CardContent>
          <p className="text-xs text-muted-foreground">vs. previous 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Active Habits</CardDescription>
          <CardTitle className="text-3xl">{habitCount}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">being tracked</p>
        </CardContent>
      </Card>
    </div>
  );
}