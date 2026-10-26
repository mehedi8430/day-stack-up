"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  startOfDay,
  subDays,
  subMonths,
} from "date-fns";
import { Plus } from "lucide-react";
import { useHabitStore } from "@/stores/habit.store";
import { getMonthWeek, shiftMonthWeek } from "@/lib/date";
import {
  buildScheduleTimelines,
  computeRangeRate,
  type HabitScheduleRow,
} from "@/lib/habit-progress";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HabitForm } from "@/app/_components/habit-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Habit } from "@/lib/types";
import type { CompletionRow } from "@/app/actions/habit.actions";
import { toast } from "sonner";
import { NotesDialog } from "@/app/_components/notes-dialog";
import { CalendarTable } from "@/app/_components/calendar-table";
import { CalendarToolbar } from "@/app/_components/calendar-toolbar";
import { CalendarProgressBar } from "@/app/_components/calendar-progress-bar";
import {
  getCalendarRange,
  getRangeLabels,
  type CalendarView,
} from "@/app/_components/calendar-utils";

interface CalendarGridProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
  initialSchedules: HabitScheduleRow[];
}

export default function CalendarGrid({
  initialHabits,
  initialCompletions,
  initialSchedules,
}: CalendarGridProps) {
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const initialized = useHabitStore((s) => s.initialized);
  const initialize = useHabitStore((s) => s.initialize);
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const reorderHabits = useHabitStore((s) => s.reorderHabits);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);

  React.useEffect(() => {
    if (!initialized) {
      initialize(initialHabits, initialCompletions);
    }
  }, [initialized, initialize, initialHabits, initialCompletions]);

  const [view, setView] = React.useState<CalendarView>("week");
  const [cursor, setCursor] = React.useState<Date>(new Date());
  const [today] = React.useState<Date>(() => startOfDay(new Date()));
  const latestWeekStart = React.useMemo(
    () => getMonthWeek(today).start,
    [today],
  );
  const [weekStart, setWeekStart] = React.useState<Date>(() => latestWeekStart);
  const [rollingEnd, setRollingEnd] = React.useState<Date>(() => today);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);
  const [toDelete, setToDelete] = React.useState<Habit | null>(null);
  const [notesDialog, setNotesDialog] = React.useState<{
    habit: Habit;
  } | null>(null);

  const range = React.useMemo(
    () => getCalendarRange({ view, cursor, weekStart, rollingEnd, today }),
    [view, cursor, weekStart, rollingEnd, today],
  );

  const { days, progressDays, previousDays, isFuture } = range;

  const sortedHabits = React.useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits],
  );

  // Schedule history is server data (refreshed by revalidation); the store
  // does not need it for optimistic habit edits.
  const schedules = React.useMemo(
    () => buildScheduleTimelines(initialSchedules),
    [initialSchedules],
  );

  // Target-aware achieved-so-far rate: weekly targets weight each habit-day,
  // creation dates trim ineligible days, and schedule history is honoured.
  const achievedRate = computeRangeRate(
    sortedHabits,
    schedules,
    completions,
    progressDays,
  );
  const previousRate = computeRangeRate(
    sortedHabits,
    schedules,
    completions,
    previousDays,
  );
  const achieved = Math.round(achievedRate.percentage ?? 0);
  const change = Math.round(
    (achievedRate.percentage ?? 0) - (previousRate.percentage ?? 0),
  );

  const { rangeLabel, rangeNoun, comparisonLabel } = getRangeLabels({
    view,
    cursor,
    weekStart,
    days,
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (habit: Habit) => {
    setEditing(habit);
    setFormOpen(true);
  };
  const openNotes = (habit: Habit) => setNotesDialog({ habit });

  const handlePreviousRange = () => {
    if (view === "month") setCursor((c) => subMonths(c, 1));
    else if (view === "week")
      setWeekStart((start) => shiftMonthWeek(start, -1));
    else setRollingEnd((end) => subDays(end, 15));
  };

  const handleNextRange = () => {
    if (view === "month") setCursor((c) => addMonths(c, 1));
    else if (view === "week")
      setWeekStart((start) => shiftMonthWeek(start, 1));
    else setRollingEnd((end) => addDays(end, 15));
  };

  const handleResetRange = () => {
    if (view === "month") setCursor(new Date());
    else if (view === "week") setWeekStart(latestWeekStart);
    else setRollingEnd(today);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <CalendarToolbar
          view={view}
          rangeLabel={rangeLabel}
          rangeNoun={rangeNoun}
          onViewChange={setView}
          onPrevious={handlePreviousRange}
          onNext={handleNextRange}
          onReset={handleResetRange}
          onAddHabit={openAdd}
        />

        {sortedHabits.length > 0 && (
          <CalendarProgressBar
            achieved={achieved}
            change={change}
            isFuture={isFuture}
            comparisonLabel={comparisonLabel}
          />
        )}

        {sortedHabits.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <CalendarTable
            days={days}
            habits={sortedHabits}
            completions={completions}
            toggle={toggleCompletion}
            onReorder={reorderHabits}
            onEdit={openEdit}
            onDelete={setToDelete}
            onOpenNotes={openNotes}
          />
        )}
      </div>

      <HabitForm open={formOpen} onOpenChange={setFormOpen} habit={editing} />

      {/* Delete habit confirm dialog */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete habit?"
        description={
          <>
            This will permanently remove{" "}
            <span className="font-semibold">{toDelete?.name}</span> and all of
            its completion history. This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteHabit(toDelete.id);
            setToDelete(null);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to delete habit",
            );
          }
        }}
      />

      <NotesDialog
        open={!!notesDialog}
        onOpenChange={(o) => !o && setNotesDialog(null)}
        habit={notesDialog?.habit ?? null}
      />
    </TooltipProvider>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
      <div className="mb-4 text-6xl">📋</div>
      <h3 className="text-lg font-semibold">No habits yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Start building a better you. Add your first habit and begin tracking
        your daily progress.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" /> Add your first habit
      </Button>
    </div>
  );
}
