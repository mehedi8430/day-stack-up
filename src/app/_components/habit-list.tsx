import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLevel } from "@/lib/date";
import { computeRangeRate } from "@/lib/habit-progress";
import type { Habit } from "@/lib/types";
import type {
  CompletionMap,
  ScheduleTimelines,
} from "@/types/habit-progress-types";
import { HabitCard } from "./habit-card";

interface HabitListProps {
  habits: Habit[];
  schedules: ScheduleTimelines;
  completedThroughToday: CompletionMap;
  weekDays: Date[];
  todayKey: string;
  completions: CompletionMap;
  canToggle: boolean;
  onToggleHabit: (habitId: string) => void;
}

export function HabitList({
  habits,
  schedules,
  completedThroughToday,
  weekDays,
  todayKey,
  completions,
  canToggle,
  onToggleHabit,
}: HabitListProps) {
  return (
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
              <HabitCard
                key={habit.id}
                habit={habit}
                rate={rate}
                score={score}
                level={level}
                isDone={isDone}
                canToggle={canToggle}
                onToggleHabit={onToggleHabit}
              />
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
  );
}
