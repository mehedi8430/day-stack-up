"use client";

import { format, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthWeek, shiftMonthWeek } from "@/lib/date";
import { AnalyticsView } from "./analytics-types";

interface AnalyticsHeaderProps {
  view: AnalyticsView;
  yearCursor: number;
  cursor: Date;
  onViewChange: (view: AnalyticsView) => void;
  onYearChange: (year: number) => void;
  onCursorChange?: (date: Date) => void;
}

export function AnalyticsHeader({
  view,
  yearCursor,
  cursor,
  onViewChange,
  onYearChange,
  onCursorChange,
}: AnalyticsHeaderProps) {
  const week = view === "week" ? getMonthWeek(cursor) : null;

  const handlePrev = () => {
    if (!onCursorChange) return;
    if (view === "month") {
      onCursorChange(subMonths(cursor, 1));
    } else if (view === "week") {
      onCursorChange(shiftMonthWeek(cursor, -1));
    }
  };

  const handleNext = () => {
    if (!onCursorChange) return;
    if (view === "month") {
      onCursorChange(addMonths(cursor, 1));
    } else if (view === "week") {
      onCursorChange(shiftMonthWeek(cursor, 1));
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {view === "year"
            ? `Your progress for ${yearCursor}`
            : week
              ? `Your progress for week ${week.index} · ${format(week.start, "MMM d")} – ${format(week.end, "MMM d, yyyy")}`
              : `Your progress for ${format(cursor, "MMMM yyyy")}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {(view === "year" || view === "month" || view === "week") && (view === "year" ? true : onCursorChange) && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={view === "year" ? () => onYearChange(yearCursor - 1) : handlePrev}
              aria-label={view === "year" ? "Previous year" : view === "month" ? "Previous month" : "Previous week"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-20 text-center text-lg font-bold">
              {view === "year"
                ? yearCursor
                : view === "month"
                  ? format(cursor, "MMM yyyy")
                  : `Week ${week?.index ?? ""}`}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={view === "year" ? () => onYearChange(yearCursor + 1) : handleNext}
              aria-label={view === "year" ? "Next year" : view === "month" ? "Next month" : "Next week"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Tabs value={view} onValueChange={(v) => onViewChange(v as AnalyticsView)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}