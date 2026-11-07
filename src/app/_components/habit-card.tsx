import { Check, Sparkles } from "lucide-react";
import type { AchievementLevel } from "@/lib/date";
import { formatTargetCount } from "@/lib/habit-progress";
import { getWeeklyTargetLabel, type Habit } from "@/lib/types";
import type { RangeRateMetric } from "@/types/habit-progress-types";
import { cn } from "@/lib/utils";

interface HabitCardProps {
  habit: Habit;
  rate: RangeRateMetric;
  score: number;
  level: AchievementLevel;
  isDone: boolean;
  canToggle: boolean;
  onToggleHabit: (habitId: string) => void;
}

export function HabitCard({
  habit,
  rate,
  score,
  level,
  isDone,
  canToggle,
  onToggleHabit,
}: HabitCardProps) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-sm sm:p-4">
      <button
        type="button"
        onClick={() => void onToggleHabit(habit.id)}
        disabled={!canToggle}
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
            <h3 className="truncate text-sm font-semibold">{habit.name}</h3>
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
}
