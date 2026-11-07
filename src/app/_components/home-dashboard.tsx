"use client";

import * as React from "react";
import { addDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import type { CompletionRow } from "@/app/actions/habit.actions";
import {
  buildCompletionMap,
  buildScheduleTimelines,
  computeRangeRate,
} from "@/lib/habit-progress";
import { getWeekDays, toKey } from "@/lib/date";
import type { Habit } from "@/lib/types";
import type { HabitScheduleRow } from "@/types/habit-progress-types";
import { useHabitStore } from "@/stores/habit.store";
import { HabitList } from "./habit-list";
import { HomeHeader } from "./home-header";
import { MilestonesCta } from "./milestones-cta";
import { QuickLinks } from "./quick-links";
import { TodayCheckIn } from "./today-check-in";
import { WeeklyProgressCard } from "./weekly-progress-card";

const MINUTE = 60_000;

function subscribeToMinute(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, MINUTE);
  return () => window.clearInterval(timer);
}

function getMinuteSnapshot(): number | null {
  return Math.floor(Date.now() / MINUTE);
}

function getServerMinuteSnapshot(): number | null {
  return null;
}

interface HomeDashboardProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
  initialSchedules: HabitScheduleRow[];
}

export function HomeDashboard({
  initialHabits,
  initialCompletions,
  initialSchedules,
}: HomeDashboardProps) {
  const minute = React.useSyncExternalStore(
    subscribeToMinute,
    getMinuteSnapshot,
    getServerMinuteSnapshot,
  );
  const now = React.useMemo(
    () => (minute === null ? null : new Date(minute * MINUTE)),
    [minute],
  );
  const today = React.useMemo(() => (now ? startOfDay(now) : null), [now]);
  const initialized = useHabitStore((state) => state.initialized);
  const storeHabits = useHabitStore((state) => state.habits);
  const storeCompletions = useHabitStore((state) => state.completions);
  const initialize = useHabitStore((state) => state.initialize);
  const toggleCompletion = useHabitStore((state) => state.toggleCompletion);

  React.useEffect(() => {
    if (!initialized) {
      initialize(initialHabits, initialCompletions);
    }
  }, [initialized, initialize, initialHabits, initialCompletions]);

  const habits = React.useMemo(
    () =>
      [...(initialized ? storeHabits : initialHabits)].sort(
        (a, b) => a.order - b.order,
      ),
    [initialized, initialHabits, storeHabits],
  );
  const initialCompletionMap = React.useMemo(
    () => buildCompletionMap(initialCompletions),
    [initialCompletions],
  );
  const completions = initialized ? storeCompletions : initialCompletionMap;
  const todayKey = today ? toKey(today) : "";
  const weekDays = React.useMemo(
    () => (today ? getWeekDays(today) : []),
    [today],
  );
  const completedThroughToday = React.useMemo(() => {
    if (!todayKey) return {};
    return Object.fromEntries(
      Object.entries(completions).filter(([key, completed]) => {
        const dateKey = key.slice(key.lastIndexOf("__") + 2);
        return completed && dateKey <= todayKey;
      }),
    );
  }, [completions, todayKey]);
  const schedules = React.useMemo(
    () => buildScheduleTimelines(initialSchedules),
    [initialSchedules],
  );
  const weeklyRate = React.useMemo(
    () => computeRangeRate(habits, schedules, completedThroughToday, weekDays),
    [habits, schedules, completedThroughToday, weekDays],
  );
  const completedToday = todayKey
    ? habits.filter((habit) => completions[`${habit.id}__${todayKey}`]).length
    : 0;
  const percentage =
    weeklyRate.percentage === null ? 0 : Math.round(weeklyRate.percentage);
  const tomorrowHref = today
    ? `/planner?date=${toKey(addDays(today, 1))}`
    : "/planner";

  const handleToggle = async (habitId: string) => {
    if (!today) return;
    try {
      await toggleCompletion(habitId, today);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update habit",
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-7 sm:px-8 sm:py-8">
      <HomeHeader now={now} />
      <WeeklyProgressCard
        now={now}
        percentage={percentage}
        weeklyRate={weeklyRate}
        habitCount={habits.length}
      />
      <QuickLinks tomorrowHref={tomorrowHref} />
      <TodayCheckIn
        now={now}
        habits={habits}
        todayKey={todayKey}
        completions={completions}
        completedToday={completedToday}
        canToggle={Boolean(today)}
        onToggleHabit={handleToggle}
      />
      <HabitList
        habits={habits}
        schedules={schedules}
        completedThroughToday={completedThroughToday}
        weekDays={weekDays}
        todayKey={todayKey}
        completions={completions}
        canToggle={Boolean(today)}
        onToggleHabit={handleToggle}
      />
      <MilestonesCta />
    </div>
  );
}
