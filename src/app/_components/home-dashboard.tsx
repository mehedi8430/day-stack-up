"use client";

import * as React from "react";
import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Circle,
  ClipboardList,
  ListTodo,
  Sparkles,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import type { CompletionRow } from "@/app/actions/habit.actions";
import { Button } from "@/components/ui/button";
import {
  buildCompletionMap,
  buildScheduleTimelines,
  computeRangeRate,
  formatTargetCount,
} from "@/lib/habit-progress";
import { getLevel, getWeekDays, toKey } from "@/lib/date";
import { getWeeklyTargetLabel, type Habit } from "@/lib/types";
import type { HabitScheduleRow } from "@/types/habit-progress-types";
import { useHabitStore } from "@/stores/habit.store";
import { cn } from "@/lib/utils";

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

  const actions = [
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/habits", label: "Milestones", icon: ClipboardList },
    { href: tomorrowHref, label: "Plan tomorrow", icon: ListTodo },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

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
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {now ? format(now, "EEEE, MMMM d") : "Your daily overview"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {now && now.getHours() < 12
              ? "Good morning"
              : now && now.getHours() < 17
                ? "Good afternoon"
                : "Welcome back"}
          </h1>
        </div>
        <Link
          href="/calendar"
          aria-label="Open habit calendar"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        >
          <CalendarDays className="size-5" />
        </Link>
      </header>

      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 via-card to-amber-100 p-5 text-foreground shadow-lg shadow-violet-900/15 dark:from-violet-500/30 dark:via-card dark:to-amber-500/20 dark:text-white sm:rounded-3xl sm:p-7">
        <div
          className="pointer-events-none absolute -right-10 -top-12 -z-10 size-44 rounded-full bg-white/50 blur-2xl dark:bg-white/10 sm:size-60"
          aria-hidden="true"
        />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground dark:text-white/85">
              Your overall progress
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                {now ? `${percentage}%` : "—"}
              </span>
              <span className="rounded-full bg-foreground/10 px-2 py-1 text-xs font-medium text-foreground/90 dark:bg-white/15 dark:text-white/90">
                This week
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground dark:text-white/80">
              {weeklyRate.target > 0
                ? `${formatTargetCount(weeklyRate.completed)} of ${formatTargetCount(weeklyRate.target)} target days completed`
                : "Add a habit to start tracking your progress"}
            </p>
          </div>
          <div className="hidden shrink-0 items-center justify-center rounded-2xl bg-foreground/5 p-4 dark:bg-white/10 sm:flex">
            <Trophy className="size-12 text-amber-300" strokeWidth={1.7} />
          </div>
        </div>
        <div
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-foreground/15 dark:bg-white/25"
          role="progressbar"
          aria-label="Overall progress this week"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, percentage)}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] dark:bg-white"
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground dark:text-white/75">
          {habits.length} {habits.length === 1 ? "habit" : "habits"} in your
          weekly routine
        </p>
      </section>

      <nav
        aria-label="Quick links"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-20 items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-semibold leading-tight">{label}</span>
          </Link>
        ))}
      </nav>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <h2 className="truncate text-sm font-semibold">
              {now ? `Today · ${format(now, "MMM d, yyyy")}` : "Today"}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {now ? `${completedToday} / ${habits.length} done` : " "}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {habits.length > 0 ? (
            habits.map((habit) => {
              const isDone = Boolean(
                todayKey && completions[`${habit.id}__${todayKey}`],
              );
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => void handleToggle(habit.id)}
                  disabled={!today}
                  aria-pressed={isDone}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent disabled:cursor-wait",
                    isDone && "border-emerald-500/30 bg-emerald-500/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Circle className="size-3.5" />
                    )}
                  </span>
                  <span className="truncate font-medium">{habit.name}</span>
                </button>
              );
            })
          ) : (
            <p className="col-span-full py-2 text-sm text-muted-foreground">
              Your daily check-in will appear here when you add a habit.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3" id="habits">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Your habits
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Weekly targets and today&apos;s progress
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1">
            <Link href="/calendar">
              View calendar <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {habits.length > 0 ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {habits.map((habit) => {
              const rate = computeRangeRate(
                [habit],
                schedules,
                completedThroughToday,
                weekDays,
              );
              const score =
                rate.percentage === null ? 0 : Math.round(rate.percentage);
              const level = getLevel(score);
              const isDone = Boolean(
                todayKey && completions[`${habit.id}__${todayKey}`],
              );

              return (
                <article
                  key={habit.id}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-sm sm:p-4"
                >
                  <button
                    type="button"
                    onClick={() => void handleToggle(habit.id)}
                    disabled={!today}
                    aria-label={`${isDone ? "Mark" : "Complete"} ${habit.name} ${isDone ? "incomplete" : "complete"} for today`}
                    aria-pressed={isDone}
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl text-xl transition-colors disabled:cursor-wait",
                      isDone
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {isDone ? (
                      <Check className="size-5" />
                    ) : (
                      habit.emoji || <Sparkles className="size-5" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {habit.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {getWeeklyTargetLabel(habit.weeklyTarget)}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
                        style={{
                          color: level.color,
                          backgroundColor: `${level.color}18`,
                        }}
                      >
                        {level.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${Math.min(100, score)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {formatTargetCount(rate.completed)} /{" "}
                        {formatTargetCount(rate.target)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-card px-5 py-8 text-center">
            <p className="font-semibold">Start with one small habit</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a habit to see your progress and daily check-ins here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/calendar">Open calendar</Link>
            </Button>
          </div>
        )}
      </section>

      <Link
        href="/habits"
        className="group flex items-center gap-3 rounded-2xl border bg-gradient-to-r from-violet-500/10 via-card to-amber-500/10 p-4 shadow-sm transition-colors hover:border-primary/30 sm:p-5"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Trophy className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            Weekly achievement
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Keep building momentum with your habit milestones
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          View milestones{" "}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
