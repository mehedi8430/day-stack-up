"use client";

import * as React from "react";
import Link from "next/link";
import {
  addMonths,
  addWeeks,
  format,
  startOfDay,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Habit } from "@/lib/types";
import type { CompletionRow } from "@/app/actions/habit.actions";
import {
  buildCompletionMap,
  compareMetrics,
  computeHabitPeriodMetric,
  getPreviousProgressPeriod,
  getProgressPeriod,
  summarizeMetrics,
  type ProgressPeriodView,
} from "@/lib/habit-progress";
import { cn } from "@/lib/utils";
import { HabitProgressCard } from "./habit-progress-card";
import { ProgressSummary } from "./progress-summary";
import { LevelLegend } from "./progress-ui";

interface HabitProgressProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
}

export function HabitProgress({
  initialHabits,
  initialCompletions,
}: HabitProgressProps) {
  const [view, setView] = React.useState<ProgressPeriodView>("week");
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [today] = React.useState<Date>(() => startOfDay(new Date()));

  const completions = React.useMemo(
    () => buildCompletionMap(initialCompletions),
    [initialCompletions],
  );

  const sortedHabits = React.useMemo(
    () => [...initialHabits].sort((a, b) => a.order - b.order),
    [initialHabits],
  );

  const period = React.useMemo(
    () => getProgressPeriod(view, cursor, today),
    [view, cursor, today],
  );
  const previousPeriod = React.useMemo(
    () => getPreviousProgressPeriod(period),
    [period],
  );
  const latestPeriod = React.useMemo(
    () => getProgressPeriod(view, today, today),
    [view, today],
  );
  const atLatest =
    period.start.getTime() >= latestPeriod.start.getTime();

  const rows = React.useMemo(
    () =>
      sortedHabits.map((habit) => {
        const current = computeHabitPeriodMetric(habit, completions, period);
        const previous = computeHabitPeriodMetric(
          habit,
          completions,
          previousPeriod,
        );
        return {
          habit,
          current,
          previous,
          comparison: compareMetrics(current, previous),
        };
      }),
    [sortedHabits, completions, period, previousPeriod],
  );

  const overall = React.useMemo(
    () => summarizeMetrics(rows.map((row) => row.current)),
    [rows],
  );
  const previousOverall = React.useMemo(
    () => summarizeMetrics(rows.map((row) => row.previous)),
    [rows],
  );
  const comparison = React.useMemo(
    () => compareMetrics(overall, previousOverall),
    [overall, previousOverall],
  );

  const periodNoun = view;
  const previousLabel =
    view === "week" ? "previous week" : "previous month";
  const previousCardLabel = period.isCurrent
    ? `Previous ${periodNoun} (same span)`
    : `Previous ${periodNoun}`;

  const periodLabel =
    view === "week"
      ? `${format(period.start, "MMM d")} – ${format(
          period.end,
          "MMM d, yyyy",
        )}`
      : format(period.start, "MMMM yyyy");

  const periodStatus = period.isFuture
    ? "Not started"
    : period.isCurrent
      ? "In progress"
      : "Complete period";

  const periodDetail = period.isFuture
    ? "No dates included yet."
    : period.isCurrent
      ? `Day ${period.elapsedDays} of ${period.totalDays} included · future dates excluded.`
      : `${period.totalDays} days included.`;

  const previousIsShorter =
    period.isCurrent && previousPeriod.elapsedDays < period.elapsedDays;

  const comparisonWindow = period.isFuture
    ? "This period has not started yet."
    : period.isCurrent
      ? `Comparing ${format(period.start, "MMM d")}–${format(
          period.effectiveEnd,
          "MMM d",
        )} with ${format(previousPeriod.start, "MMM d")}–${format(
          previousPeriod.effectiveEnd,
          "MMM d",
        )}, the equivalent elapsed days.${
          previousIsShorter
            ? " The previous month ended first, so all of its days are used."
            : ""
        }`
      : `Comparing the complete ${periodNoun} with the previous ${periodNoun}.`;

  const handlePrevious = () => {
    setCursor((current) =>
      view === "week" ? subWeeks(current, 1) : subMonths(current, 1),
    );
  };

  const handleNext = () => {
    if (atLatest) return;
    setCursor((current) =>
      view === "week" ? addWeeks(current, 1) : addMonths(current, 1),
    );
  };

  const handleReset = () => {
    setCursor(today);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Habit Progress</h1>
          <p className="text-sm text-muted-foreground">
            Weekly and monthly completion for every habit, compared with the
            previous period.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as ProgressPeriodView)}
          >
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              aria-label={`Previous ${periodNoun}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div
              className="min-w-44 text-center sm:min-w-52"
              aria-live="polite"
            >
              <h2 className="whitespace-nowrap text-lg font-bold">
                {periodLabel}
              </h2>
              <p
                className={cn(
                  "text-xs",
                  period.isCurrent
                    ? "font-medium text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
                )}
              >
                {periodStatus}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={atLatest}
              aria-label={`Next ${periodNoun}`}
              title={
                atLatest ? `Already showing the latest ${periodNoun}` : undefined
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!period.isCurrent && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              This {periodNoun}
            </Button>
          )}
        </div>
      </header>

      {sortedHabits.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
              <span
                className={cn(
                  "font-semibold",
                  period.isCurrent
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground",
                )}
              >
                {periodStatus}
              </span>
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <span className="text-muted-foreground">{periodDetail}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {comparisonWindow}
            </p>
          </div>

          <ProgressSummary
            overall={overall}
            previous={previousOverall}
            comparison={comparison}
            period={period}
            previousLabel={previousLabel}
          />

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Habit breakdown
                </h2>
                <p className="text-sm text-muted-foreground">
                  Selected {periodNoun} versus the previous {periodNoun}.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {sortedHabits.length}{" "}
                {sortedHabits.length === 1 ? "habit" : "habits"}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {rows.map((row) => (
                <HabitProgressCard
                  key={row.habit.id}
                  habit={row.habit}
                  current={row.current}
                  previous={row.previous}
                  comparison={row.comparison}
                  periodNoun={periodNoun}
                  previousLabel={previousCardLabel}
                />
              ))}
            </div>
          </section>

          <LevelLegend />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
      <div className="mb-4 text-6xl">📈</div>
      <h3 className="text-lg font-semibold">No habits to show yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Add habits on the calendar and mark them done to unlock weekly and
        monthly progress.
      </p>
      <Button asChild>
        <Link href="/">Go to the calendar</Link>
      </Button>
    </div>
  );
}
