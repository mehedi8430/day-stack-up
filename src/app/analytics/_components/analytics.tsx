"use client";

import * as React from "react";
import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import {
  getMonthDays,
  getMonthWeekDays,
  getYearDays,
  getMonthBuckets,
  toKey,
  getLevel,
  computeStreaks,
  formatDayShort,
} from "@/lib/date";
import { getCategory, Habit } from "@/lib/types";
import { CompletionRow } from "@/app/actions/habit.actions";
import { PlannerTask } from "@/lib/planner-types";
import { getPlannerTasksBetween } from "@/app/actions/planner.actions";
import { AnalyticsView } from "./analytics-types";
import { AnalyticsHeader } from "./analytics-header";
import { SummaryCards } from "./summary-cards";
import { TimeWorkedChart } from "./time-worked-chart";
import {
  MonthlyCompletionChart,
  MonthlyCompletionPoint,
} from "./monthly-completion-chart";
import { PerHabitChart, PerHabitPoint } from "./per-habit-chart";
import { DailyScoreChart, DailyScorePoint } from "./daily-score-chart";
import {
  StreaksPanel,
  StreakSummary,
  StreakRow,
} from "./streaks-panel";
import { Heatmap, HeatCell } from "./heatmap";
import { HabitStabilityPanel } from "./habit-stability-panel";
import {
  buildCompletionMap,
  buildScheduleTimelines,
  computeHabitPeriodMetric,
  computeHabitStability,
  computeRangeRate,
  getProgressPeriod,
  isHabitEligibleOn,
  summarizeMetrics,
  type HabitScheduleRow,
} from "@/lib/habit-progress";

interface AnalyticsProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
  initialSchedules: HabitScheduleRow[];
  initialPlannerTasks: PlannerTask[];
}

export function Analytics({
  initialHabits,
  initialCompletions,
  initialSchedules,
  initialPlannerTasks,
}: AnalyticsProps) {
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [yearCursor, setYearCursor] = React.useState<number>(
    new Date().getFullYear(),
  );
  const [view, setView] = React.useState<AnalyticsView>("month");
  const [plannerTasks, setPlannerTasks] =
    React.useState<PlannerTask[]>(initialPlannerTasks);
  const [today] = React.useState(() => new Date());

  const monthDays = React.useMemo(
    () => getMonthDays(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );
  const weekDays = React.useMemo(() => getMonthWeekDays(cursor), [cursor]);

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
    () => [...initialHabits].sort((a, b) => a.order - b.order),
    [initialHabits],
  );

  const completions = React.useMemo(
    () => buildCompletionMap(initialCompletions),
    [initialCompletions],
  );
  const timelines = React.useMemo(
    () => buildScheduleTimelines(initialSchedules),
    [initialSchedules],
  );
  const completionsThroughToday = React.useMemo(() => {
    const todayKey = toKey(today);
    return Object.fromEntries(
      Object.entries(completions).filter(([key, completed]) => {
        const completionDate = key.slice(key.lastIndexOf("__") + 2);
        return completed && completionDate <= todayKey;
      }),
    );
  }, [completions, today]);
  const selectedPeriod = React.useMemo(
    () => getProgressPeriod(view === "week" ? "week" : "month", cursor, today),
    [view, cursor, today],
  );
  const selectedMetrics = React.useMemo(
    () =>
      sortedHabits.map((habit) =>
        computeHabitPeriodMetric(habit, timelines, completions, selectedPeriod),
      ),
    [sortedHabits, timelines, completions, selectedPeriod],
  );
  const overallMetric = React.useMemo(
    () => summarizeMetrics(selectedMetrics),
    [selectedMetrics],
  );
  const level =
    overallMetric.percentage === null
      ? null
      : getLevel(overallMetric.percentage);

  const perHabitData: PerHabitPoint[] = sortedHabits.map((habit, index) => {
    const metric = selectedMetrics[index];
    return {
      name: habit.name,
      days: metric.completed,
      total: metric.target,
      fill: getCategory(habit.category).color,
    };
  });

  const dailyData: DailyScorePoint[] = days.map((d) => {
    const metric =
      toKey(d) > toKey(today)
        ? null
        : computeRangeRate(sortedHabits, timelines, completions, [d]);
    return {
      date: formatDayShort(d),
      full: format(d, "MMM d"),
      score:
        metric?.percentage == null ? null : Math.round(metric.percentage),
    };
  });

  const todayStart = React.useMemo(() => startOfDay(today), [today]);
  const earliestHabitDay = sortedHabits.reduce((earliest, habit) => {
    const createdOn = habit.createdAt.slice(0, 10);
    return createdOn < earliest ? createdOn : earliest;
  }, toKey(todayStart));
  const allTimeStreakDays = React.useMemo(
    () =>
      toKey(todayStart) < earliestHabitDay
        ? []
        : eachDayOfInterval({
            start: new Date(`${earliestHabitDay}T12:00:00`),
            end: todayStart,
          }),
    [earliestHabitDay, todayStart],
  );
  const streaks: StreakRow[] = sortedHabits.map((habit) => ({
    habit,
    current: (() => {
      const currentStreakEnd =
        completions[`${habit.id}__${toKey(todayStart)}`]
          ? todayStart
          : subDays(todayStart, 1);
      return computeStreaks(
        habit.id,
        completions,
        allTimeStreakDays.filter(
          (day) =>
            isHabitEligibleOn(habit, day) &&
            toKey(day) <= toKey(currentStreakEnd),
        ),
      ).current;
    })(),
    best: computeStreaks(
      habit.id,
      completions,
      allTimeStreakDays.filter((day) => isHabitEligibleOn(habit, day)),
    ).best,
  }));

  const yearDays = React.useMemo(() => getYearDays(yearCursor), [yearCursor]);
  const monthBuckets = React.useMemo(
    () => getMonthBuckets(yearCursor),
    [yearCursor],
  );
  const yearStart = yearDays[0];
  const yearOverallMetric = React.useMemo(() => {
    if (toKey(yearStart) > toKey(today)) {
      return { completed: 0, target: 0, percentage: null };
    }
    return computeRangeRate(
      sortedHabits,
      timelines,
      completionsThroughToday,
      yearDays,
    );
  }, [
    yearStart,
    today,
    sortedHabits,
    timelines,
    completionsThroughToday,
    yearDays,
  ]);
  const yearLevel =
    yearOverallMetric.percentage === null
      ? null
      : getLevel(yearOverallMetric.percentage);

  const monthlyChartData: MonthlyCompletionPoint[] = monthBuckets.map(
    (monthDaysArr, m) => {
      const period = getProgressPeriod("month", monthDaysArr[0], today);
      const metric = summarizeMetrics(
        sortedHabits.map((habit) =>
          computeHabitPeriodMetric(habit, timelines, completions, period),
        ),
      );
      return {
        month: format(new Date(yearCursor, m, 1), "MMM"),
        score:
          metric.percentage === null ? null : Math.round(metric.percentage),
      };
    },
  );

  const consistencyDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: subDays(todayStart, 29),
        end: todayStart,
      }),
    [todayStart],
  );
  const previousConsistencyDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: subDays(todayStart, 59),
        end: subDays(todayStart, 30),
      }),
    [todayStart],
  );
  const consistency = computeRangeRate(
    sortedHabits,
    timelines,
    completionsThroughToday,
    consistencyDays,
  ).percentage;
  const previousConsistency = computeRangeRate(
    sortedHabits,
    timelines,
    completionsThroughToday,
    previousConsistencyDays,
  ).percentage;
  const consistencyTrend =
    consistency === null || previousConsistency === null
      ? "na"
      : consistency > previousConsistency
        ? "up"
        : consistency < previousConsistency
          ? "down"
          : "same";

  const habitStability = React.useMemo(
    () =>
      sortedHabits.map((habit) => ({
        habit,
        stability: computeHabitStability(habit, completions, new Date()),
      })),
    [sortedHabits, completions],
  );

  const heatCells: HeatCell[] = yearDays.map((d) => {
    const metric = computeRangeRate(sortedHabits, timelines, completions, [d]);
    const done = toKey(d) > toKey(today) ? 0 : metric.completed;
    const ratio = metric.target > 0 ? done / metric.target : 0;
    return {
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE, MMM d"),
      ratio,
      done,
      total: metric.target,
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

      <StreakSummary
        streaks={streaks}
        consistency={consistency}
        consistencyTrend={consistencyTrend}
      />

      <SummaryCards
        view={view}
        completion={
          view === "year"
            ? yearOverallMetric.percentage === null
              ? null
              : Math.round(yearOverallMetric.percentage)
            : overallMetric.percentage === null
              ? null
              : Math.round(overallMetric.percentage)
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
        <MonthlyCompletionChart
          data={monthlyChartData}
        />
      )}

      {view !== "year" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <PerHabitChart data={perHabitData} dayCount={days.length} />
          <HabitStabilityPanel rows={habitStability} />
        </div>
      ) : (
        <HabitStabilityPanel rows={habitStability} />
      )}

      {view !== "year" && <DailyScoreChart data={dailyData} />}

      <StreaksPanel streaks={streaks} />

      <Heatmap year={yearCursor} cells={heatCells} />
    </div>
  );
}
