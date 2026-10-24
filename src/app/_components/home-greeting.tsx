"use client";

import * as React from "react";
import { format } from "date-fns";
import { toKey } from "@/lib/date";
import { useHabitStore } from "@/stores/habit.store";
import type { CompletionRow } from "@/app/actions/habit.actions";
import type { Habit } from "@/lib/types";

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

function getProgressLabel(total: number, done: number): string {
  if (total === 0) return "No habits yet — add your first one below";
  if (done >= total) return `All ${total} habits done — nice work!`;
  return `${done} of ${total} habits done`;
}

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

interface HomeGreetingProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
}

export function HomeGreeting({
  initialHabits,
  initialCompletions,
}: HomeGreetingProps) {
  const minute = React.useSyncExternalStore(
    subscribeToMinute,
    getMinuteSnapshot,
    getServerMinuteSnapshot,
  );
  const now = React.useMemo(
    () => (minute === null ? null : new Date(minute * MINUTE)),
    [minute],
  );
  const initialized = useHabitStore((s) => s.initialized);
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);

  const activeHabits = initialized ? habits : initialHabits;

  const completedToday = React.useMemo(() => {
    if (!now) return 0;

    const todayKey = toKey(now);

    if (initialized) {
      return activeHabits.filter(
        (habit) => completions[`${habit.id}__${todayKey}`],
      ).length;
    }

    return initialCompletions.filter(
      (completion) => completion.date === todayKey && completion.completed,
    ).length;
  }, [now, initialized, activeHabits, completions, initialCompletions]);

  const greeting = now ? getGreeting(now.getHours()) : "Welcome back";
  const dateLabel = now ? format(now, "EEEE, MMMM d") : null;
  const progressLabel = getProgressLabel(activeHabits.length, completedToday);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
      <p className="min-h-5 text-sm text-muted-foreground">
        {dateLabel ? `${dateLabel} · ${progressLabel}` : "\u00A0"}
      </p>
    </div>
  );
}
