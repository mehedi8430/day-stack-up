import { format } from "date-fns";
import { CalendarDays, Check, Circle } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { CompletionMap } from "@/types/habit-progress-types";
import { cn } from "@/lib/utils";

interface TodayCheckInProps {
  now: Date | null;
  habits: Habit[];
  todayKey: string;
  completions: CompletionMap;
  completedToday: number;
  canToggle: boolean;
  onToggleHabit: (habitId: string) => void;
}

export function TodayCheckIn({
  now,
  habits,
  todayKey,
  completions,
  completedToday,
  canToggle,
  onToggleHabit,
}: TodayCheckInProps) {
  return (
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
                onClick={() => void onToggleHabit(habit.id)}
                disabled={!canToggle}
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
  );
}
