"use client";

import * as React from "react";
import { format, isToday, subDays } from "date-fns";
import {
  getMonthDays,
  getYearDays,
  getMonthBuckets,
  toKey,
  monthlyAverageScore,
  yearlyCompletionRatio,
  getLevel,
  computeStreaks,
  formatDayShort,
} from "@/lib/date";
import { useHabitStore } from "@/stores/habit.store";
import { getCategory, Habit } from "@/lib/types";
import { CompletionRow } from "@/app/actions/habit.actions";
import { PlannerTask } from "@/lib/planner-types";
import { getPlannerTasksBetween } from "@/app/actions/planner.actions";
import { AnalyticsView } from "./analytics-types";
import { AnalyticsHeader } from "./analytics-header";
import { SummaryCards } from "./summary-cards";
import { TimeWorkedChart } from "./time-worked-chart";
import { MonthlyCompletionChart, MonthlyCompletionPoint } from "./monthly-completion-chart";
import { PerHabitChart, PerHabitPoint } from "./per-habit-chart";
import { DailyScoreChart, DailyScorePoint } from "./daily-score-chart";
import { StreaksPanel, StreakRow } from "./streaks-panel";
import { Heatmap, HeatCell } from "./heatmap";

interface AnalyticsProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
  initialPlannerTasks: PlannerTask[];
}

export function Analytics({ initialHabits, initialCompletions, initialPlannerTasks }: AnalyticsProps) {
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const initialized = useHabitStore((s) => s.initialized);
  const initialize = useHabitStore((s) => s.initialize);

  React.useEffect(() => {
    if (!initialized) {
      initialize(initialHabits, initialCompletions);
    }
  }, [initialized, initialize, initialHabits, initialCompletions]);

  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [yearCursor, setYearCursor] = React.useState<number>(new Date().getFullYear());
  const [view, setView] = React.useState<AnalyticsView>("month");
  const [plannerTasks, setPlannerTasks] = React.useState<PlannerTask[]>(initialPlannerTasks);

  const monthDays = React.useMemo(
    () => getMonthDays(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );
  const weekDays = React.useMemo(() => {
    const end = isToday(cursor) ? new Date() : cursor;
    return Array.from({ length: 7 }, (_, i) => subDays(end, 6 - i));
  }, [cursor]);

  const days = view === "month" ? monthDays : weekDays;

  const [from, to] = React.useMemo(() => {
    if (view === "year") {
      return [
        format(new Date(yearCursor, 0, 1), "yyyy-MM-dd"),
        format(new Date(yearCursor, 11, 31), "yyyy-MM-dd"),
      ];
    }
    if (days.length === 0) return ["", ""];
    return [toKey(days[0]), toKey(days[days.length - 1])];
  }, [view, yearCursor, days]);

  React.useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    getPlannerTasksBetween(from, to)
      .then((res) => {
        if (!cancelled) setPlannerTasks(res.tasks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const sortedHabits = React.useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  );

  const overallRate = monthlyAverageScore(completions, sortedHabits, monthDays);
  const level = getLevel(overallRate);

  const perHabitData: PerHabitPoint[] = sortedHabits.map((h) => {
    const count = days.filter(
      (d) => completions[`${h.id}__${toKey(d)}`]
    ).length;
    return {
      name: h.name,
      days: count,
      total: days.length,
      fill: getCategory(h.category).color,
    };
  });

  const dailyData: DailyScorePoint[] = days.map((d) => {
    const done = sortedHabits.filter(
      (h) => completions[`${h.id}__${toKey(d)}`]
    ).length;
    const pct = sortedHabits.length
      ? Math.round((done / sortedHabits.length) * 100)
      : 0;
    return {
      date: formatDayShort(d),
      full: format(d, "MMM d"),
      score: pct,
    };
  });

  const streaks: StreakRow[] = sortedHabits.map((h) => ({
    habit: h,
    ...computeStreaks(h.id, completions, monthDays),
  }));

  const yearOverallRate = yearlyCompletionRatio(completions, sortedHabits, yearCursor);
  const yearLevel = getLevel(yearOverallRate);
  const yearDays = React.useMemo(() => getYearDays(yearCursor), [yearCursor]);
  const monthBuckets = React.useMemo(() => getMonthBuckets(yearCursor), [yearCursor]);

  const monthlyChartData: MonthlyCompletionPoint[] = monthBuckets.map((monthDaysArr, m) => {
    const pct = monthlyAverageScore(completions, sortedHabits, monthDaysArr);
    return {
      month: format(new Date(yearCursor, m, 1), "MMM"),
      score: Math.round(pct),
    };
  });

  const yearStreaks: StreakRow[] = sortedHabits.map((h) => ({
    habit: h,
    ...computeStreaks(h.id, completions, yearDays),
  }));
  const yearBestStreak = Math.max(0, ...yearStreaks.map((s) => s.best));

  const heatCells: HeatCell[] = yearDays.map((d) => {
    const done = sortedHabits.filter(
      (h) => completions[`${h.id}__${toKey(d)}`]
    ).length;
    const ratio = sortedHabits.length ? done / sortedHabits.length : 0;
    return {
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE, MMM d"),
      ratio,
      done,
      total: sortedHabits.length,
    };
  });

  if (sortedHabits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
        <div className="mb-4 text-6xl">📊</div>
        <h3 className="text-lg font-semibold">No data to analyze yet</h3>
        <p className="text-sm text-muted-foreground">
          Add habits and mark them done to unlock your analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        view={view}
        yearCursor={yearCursor}
        cursor={cursor}
        onViewChange={setView}
        onYearChange={setYearCursor}
        onCursorChange={setCursor}
      />

      <SummaryCards
        view={view}
        completion={Math.round(view === "year" ? yearOverallRate : overallRate)}
        bestStreak={
          view === "year"
            ? yearBestStreak
            : Math.max(0, ...streaks.map((s) => s.current))
        }
        habitCount={sortedHabits.length}
        level={view === "year" ? yearLevel : level}
      />

      <TimeWorkedChart
        view={view}
        yearCursor={yearCursor}
        days={days}
        tasks={plannerTasks}
      />

      {view === "year" && (
        <MonthlyCompletionChart yearCursor={yearCursor} data={monthlyChartData} />
      )}

      {view !== "year" && (
        <PerHabitChart data={perHabitData} dayCount={days.length} />
      )}

      {view !== "year" && <DailyScoreChart data={dailyData} />}

      {view !== "year" && <StreaksPanel streaks={streaks} />}

      <Heatmap year={yearCursor} cells={heatCells} />
    </div>
  );
}