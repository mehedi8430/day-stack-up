"use client";

import * as React from "react";
import Link from "next/link";
import { addMonths, format, startOfDay, subMonths } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shiftMonthWeek } from "@/lib/date";
import type { Habit } from "@/lib/types";
import type { CompletionRow } from "@/app/actions/habit.actions";
import {
  buildCompletionMap,
  buildScheduleTimelines,
  compareMetrics,
  computeHabitPeriodMetric,
  getPreviousProgressPeriod,
  getProgressPeriod,
  summarizeMetrics,
  type HabitScheduleRow,
  type ProgressPeriodView,
} from "@/lib/habit-progress";
import { cn } from "@/lib/utils";
import { HabitProgressCard } from "./habit-progress-card";
import { ProgressSummary } from "./progress-summary";
import { LevelLegend } from "./progress-ui";

interface HabitProgressProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
  initialSchedules: HabitScheduleRow[];
}

export function HabitProgress({
  initialHabits,
  initialCompletions,
  initialSchedules,
}: HabitProgressProps) {
  const [view, setView] = React.useState<ProgressPeriodView>("week");
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [today] = React.useState<Date>(() => startOfDay(new Date()));

  const completions = React.useMemo(
    () => buildCompletionMap(initialCompletions),
    [initialCompletions],
  );

  const schedules = React.useMemo(
    () => buildScheduleTimelines(initialSchedules),
    [initialSchedules],
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
        const current = computeHabitPeriodMetric(
          habit,
          schedules,
          completions,
          period,
        );
        const previous = computeHabitPeriodMetric(
          habit,
          schedules,
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
    [sortedHabits, schedules, completions, period, previousPeriod],
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
  const previousCardLabel = `Previous ${periodNoun}`;

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
      ? `Day ${period.elapsedDays} of ${period.totalDays} · progress is measured against the full period target, including days after today.`
      : `${period.totalDays} days included.`;

  const comparisonWindow = period.isFuture
    ? "This period has not started yet."
    : period.isCurrent
      ? `Comparing full-period goals: this ${periodNoun} (through ${format(
          period.effectiveEnd,
          "MMM d",
        )}) against the complete previous ${periodNoun}, which kept the same target.`
      : `Comparing the complete ${periodNoun} with the previous ${periodNoun}. Both periods are measured against their full-period targets.`;

  const handlePrevious = () => {
    setCursor((current) =>
      view === "week" ? shiftMonthWeek(current, -1) : subMonths(current, 1),
    );
  };

  const handleNext = () => {
    if (atLatest) return;
    setCursor((current) =>
      view === "week" ? shiftMonthWeek(current, 1) : addMonths(current, 1),
    );
  };

  const handleReset = () => {
    setCursor(today);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <header className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/[0.07] via-card to-emerald-500/[0.08] px-5 py-6 shadow-sm sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            YOUR MOMENTUM, AT A GLANCE
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Progress, one day at a time.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            You stack your days; the days stack your life. Celebrate what&apos;s
            working and keep building the habits that move you forward.
          </p>
        </div>
      </header>

      <section
        className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4"
        aria-label="Progress period controls"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as ProgressPeriodView)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid h-11 w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="week" className="px-5">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="px-5">
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handlePrevious}
              aria-label={`Previous ${periodNoun}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div
              className="min-w-0 flex-1 text-center sm:min-w-48 sm:flex-initial"
              aria-live="polite"
            >
              <h2 className="text-sm font-bold sm:text-base">{periodLabel}</h2>
              <p
                className={cn(
                  "mt-0.5 text-xs",
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
              className="h-10 w-10 shrink-0"
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
            <div className="flex justify-end sm:pl-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-10"
                onClick={handleReset}
              >
                This {periodNoun}
              </Button>
            </div>
          )}
        </div>
      </section>

      {sortedHabits.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex gap-3 rounded-2xl border border-primary/10 bg-primary/[0.035] px-4 py-3.5 sm:px-5">
            <CalendarDays
              className="mt-0.5 h-4 w-4 shrink-0 text-primary/70"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {comparisonWindow}
              </p>
            </div>
          </div>

          <ProgressSummary
            overall={overall}
            previous={previousOverall}
            comparison={comparison}
            period={period}
            previousLabel={previousLabel}
          />

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Your habits
                </h2>
                <p className="text-sm text-muted-foreground">
                  Every check-in is a step forward. Here&apos;s how each habit
                  is doing.
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
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/20 px-5 py-14 text-center sm:py-20">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border bg-background text-primary shadow-sm">
        <CalendarDays className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold">Your progress story starts here</h3>
      <p className="mb-6 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Choose a few habits that matter to you. Each small win will show up here
        and add to your momentum.
      </p>
      <Button asChild className="h-11 px-5">
        <Link href="/">Explore your calendar</Link>
      </Button>
    </div>
  );
}
