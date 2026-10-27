"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { AchievementLevel } from "@/lib/date";
import { LevelBadge } from "@/app/progress/_components/progress-ui";
import { AnalyticsView } from "./analytics-types";

interface SummaryCardsProps {
  view: AnalyticsView;
  completion: number | null;
  habitCount: number;
  level: AchievementLevel | null;
}

export function SummaryCards({
  view,
  completion,
  habitCount,
  level,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            {view === "year"
              ? "Yearly Completion"
              : view === "week"
                ? "Weekly Completion"
                : "Monthly Completion"}
          </CardDescription>
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
          <CardDescription>Level Badge</CardDescription>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LevelBadge level={level} className="text-lg" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            based on {view === "year"
              ? "yearly"
              : view === "week"
                ? "weekly"
                : "monthly"} progress
          </p>
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