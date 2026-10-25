"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  format,
  addDays,
  addMonths,
  addWeeks,
  subDays,
  subMonths,
  subWeeks,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  min,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useHabitStore } from "@/stores/habit.store";
import { getMonthDays, toKey } from "@/lib/date";
import {
  buildScheduleTimelines,
  computeRangeRate,
  type HabitScheduleRow,
} from "@/lib/habit-progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HabitForm } from "@/app/_components/habit-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { Habit } from "@/lib/types";
import { CompletionRow } from "@/app/actions/habit.actions";
import { toast } from "sonner";
import { NotesDialog } from "@/app/_components/notes-dialog";
import { SortableRow } from "@/app/_components/sortable-row";

type CalendarView = "week" | "month" | "last15";

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function getRollingDays(end: Date, count: number): Date[] {
  const endDay = startOfDay(end);
  return eachDayOfInterval({
    start: subDays(endDay, count - 1),
    end: endDay,
  });
}

function getMonthProgressRange(monthCursor: Date, today: Date) {
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const currentMonthStart = startOfMonth(today);

  if (monthStart > currentMonthStart) {
    return { current: [], previous: [], isFuture: true };
  }

  const isCurrentMonth = isSameMonth(monthCursor, today);
  const currentEnd = isCurrentMonth ? min([today, monthEnd]) : monthEnd;
  const current = eachDayOfInterval({ start: monthStart, end: currentEnd });

  const previousStart = startOfMonth(subMonths(monthStart, 1));
  const previousMonthEnd = endOfMonth(previousStart);
  const previousEnd = isCurrentMonth
    ? min([addDays(previousStart, current.length - 1), previousMonthEnd])
    : previousMonthEnd;

  return {
    current,
    previous: eachDayOfInterval({ start: previousStart, end: previousEnd }),
    isFuture: false,
  };
}

interface CalendarGridProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
  initialSchedules: HabitScheduleRow[];
}

export function CalendarGrid({
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

  const [view, setView] = React.useState<CalendarView>("month");
  const [cursor, setCursor] = React.useState<Date>(new Date());
  const [today] = React.useState<Date>(() => startOfDay(new Date()));
  const latestWeekStart = React.useMemo(
    () => subWeeks(startOfWeek(today, { weekStartsOn: 6 }), 1),
    [today],
  );
  const [weekStart, setWeekStart] = React.useState<Date>(() => latestWeekStart);
  const [rollingEnd, setRollingEnd] = React.useState<Date>(() => today);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);
  const [toDelete, setToDelete] = React.useState<Habit | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [notesDialog, setNotesDialog] = React.useState<{
    habit: Habit;
  } | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const range = React.useMemo(() => {
    if (view === "week") {
      const weekDays = getWeekDays(weekStart);
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 6 });

      if (weekStart.getTime() > currentWeekStart.getTime()) {
        return {
          days: weekDays,
          progressDays: [],
          previousDays: [],
          isFuture: true,
        };
      }

      const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime();
      const progressDays = isCurrentWeek
        ? weekDays.filter((day) => day <= today)
        : weekDays;
      const previousWeekDays = getWeekDays(subWeeks(weekStart, 1));

      return {
        days: weekDays,
        progressDays,
        previousDays: isCurrentWeek
          ? previousWeekDays.slice(0, progressDays.length)
          : previousWeekDays,
        isFuture: false,
      };
    }

    if (view === "last15") {
      const rollingDays = getRollingDays(rollingEnd, 15);
      const progressDays = rollingDays.filter((day) => day <= today);

      if (progressDays.length === 0) {
        return {
          days: rollingDays,
          progressDays: [],
          previousDays: [],
          isFuture: true,
        };
      }

      return {
        days: rollingDays,
        progressDays,
        previousDays: getRollingDays(
          subDays(rollingDays[0], 1),
          progressDays.length,
        ),
        isFuture: false,
      };
    }

    const monthProgress = getMonthProgressRange(cursor, today);
    return {
      days: getMonthDays(cursor.getFullYear(), cursor.getMonth()),
      progressDays: monthProgress.current,
      previousDays: monthProgress.previous,
      isFuture: monthProgress.isFuture,
    };
  }, [view, cursor, weekStart, rollingEnd, today]);

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

  const comparisonLabel =
    view === "week"
      ? "the week before"
      : view === "last15"
        ? "the previous 15 days"
        : "the month before";

  const trendLabel = isFuture
    ? "Not started yet"
    : change > 0
      ? `↑ ${change}% from ${comparisonLabel}`
      : change < 0
        ? `↓ ${Math.abs(change)}% from ${comparisonLabel}`
        : `No change from ${comparisonLabel}`;

  const trendClassName = isFuture
    ? "text-muted-foreground"
    : change > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : change < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  const habitCol = isMobile ? 180 : 340;
  const dayCol = isMobile ? 40 : 48;
  const counterCol = isMobile ? 48 : 64;
  const cols = `${habitCol}px repeat(${days.length}, minmax(${dayCol}px, 1fr)) ${counterCol}px`;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sortedHabits.map((h) => h.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    reorderHabits(arrayMove(ids, oldIndex, newIndex));
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (h: Habit) => {
    setEditing(h);
    setFormOpen(true);
  };

  const handlePreviousRange = () => {
    if (view === "month") setCursor((c) => subMonths(c, 1));
    else if (view === "week") setWeekStart((start) => subWeeks(start, 1));
    else setRollingEnd((end) => subDays(end, 15));
  };

  const handleNextRange = () => {
    if (view === "month") setCursor((c) => addMonths(c, 1));
    else if (view === "week") setWeekStart((start) => addWeeks(start, 1));
    else setRollingEnd((end) => addDays(end, 15));
  };

  const handleResetRange = () => {
    if (view === "month") setCursor(new Date());
    else if (view === "week") setWeekStart(latestWeekStart);
    else setRollingEnd(today);
  };

  const monthLabel = format(cursor, "MMMM yyyy");
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(
    weekEnd,
    "MMM d, yyyy",
  )}`;
  const rollingLabel =
    view === "last15" && days.length > 0
      ? `${format(days[0], "MMM d")} – ${format(
          days[days.length - 1],
          "MMM d, yyyy",
        )}`
      : "";
  const rangeLabel =
    view === "month" ? monthLabel : view === "week" ? weekLabel : rollingLabel;
  const rangeNoun =
    view === "month" ? "month" : view === "week" ? "week" : "15 days";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Calendar Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as CalendarView)}
            >
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="last15">Last 15</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousRange}
                aria-label={`Previous ${rangeNoun}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-40 whitespace-nowrap text-center text-lg font-bold sm:min-w-52 sm:text-xl">
                {rangeLabel}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextRange}
                aria-label={`Next ${rangeNoun}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetRange}
                className="ml-1"
              >
                {view === "week" ? "Last week" : "Today"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/planner">
              <Button variant="outline" className="gap-2 px-2.5 sm:px-4">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Daily Planner</span>
              </Button>
            </Link>
            <Button onClick={openAdd} className="gap-2 px-2.5 sm:px-4">
              <Plus className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">Add Habit</span>
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {sortedHabits.length > 0 && (
          <div className="rounded-lg border bg-card px-4 py-3">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Habit completion for the selected range"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.max(0, achieved))}
              aria-valuetext={`${achieved}%`}
              title="Weighted by each habit's weekly target, creation date, and schedule history"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, achieved))}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] leading-tight sm:text-xs">
              <span
                className={cn("font-medium", trendClassName)}
                title="Percentage-point change compared with the previous period"
              >
                {trendLabel}
              </span>
              <span className="font-semibold text-foreground">
                {achieved}% achieved
              </span>
            </div>
          </div>
        )}

        {sortedHabits.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="overflow-auto rounded-lg border">
            <div
              className="grid min-w-max"
              style={{ gridTemplateColumns: cols }}
            >
              {/* Header row */}
              <div className="sticky left-0 z-30 flex items-center border-b border-r bg-card px-3 py-3 font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                Habit
              </div>
              {days.map((d) => {
                const todayCol = isToday(d);
                return (
                  <div
                    key={toKey(d)}
                    className={cn(
                      "flex flex-col items-center justify-center border-b border-r py-2 text-xs",
                      todayCol && "bg-primary/10",
                    )}
                  >
                    <span className="font-semibold uppercase text-muted-foreground">
                      {format(d, "EEE")}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                        todayCol &&
                          "bg-primary font-bold text-primary-foreground",
                      )}
                    >
                      {format(d, "d")}
                    </span>
                  </div>
                );
              })}
              <div className="sticky right-0 z-30 flex items-center justify-center border-b border-l bg-card py-3 font-semibold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                ✔
              </div>

              {/* Habit rows */}
              <div className="contents group">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedHabits.map((h) => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedHabits.map((h) => (
                      <SortableRow
                        key={h.id}
                        habit={h}
                        days={days}
                        completions={completions}
                        toggle={toggleCompletion}
                        onEdit={openEdit}
                        onDelete={setToDelete}
                        onOpenNotes={(habit) => setNotesDialog({ habit })}
                        cols={cols}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
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
