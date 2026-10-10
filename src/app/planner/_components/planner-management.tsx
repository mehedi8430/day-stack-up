"use client";

import * as React from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { Clock3 } from "lucide-react";
import { toast } from "sonner";
import {
  deletePlannerTask,
  getPlannerTasksBetween,
  movePlannerTaskToDate,
  reorderPlannerTasks,
  updatePlannerTask,
} from "@/app/actions/planner.actions";
import type { PlannerStatus, PlannerTask } from "@/lib/planner-types";
import { sortPlannerTasks } from "@/lib/planner-utils";
import { DeletePlannerTaskDialog } from "./delete-planner-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import { PlannerHeader } from "./planner-header";
import { PlannerStatsSidebar } from "./planner-stats-sidebar";
import { PlannerTaskManagement } from "./planner-task-management";
import { WeekStrip } from "./week-strip";

interface PlannerManagementProps {
  initialTasks: PlannerTask[];
  today: string;
  selectedDate: string;
  weekStart: string;
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function weekStartOf(date: string): string {
  return dateKey(
    startOfWeek(parseISO(`${date}T12:00:00`), { weekStartsOn: 1 }),
  );
}

export function PlannerManagement({
  initialTasks,
  today,
  selectedDate: initialDate,
  weekStart: initialWeekStart,
}: PlannerManagementProps) {
  const [selectedDate, setSelectedDate] = React.useState(initialDate);
  const [tasks, setTasks] = React.useState(initialTasks);
  const [loadedWeekStart, setLoadedWeekStart] = React.useState(initialWeekStart);
  const [isLoading, setIsLoading] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<PlannerTask | null>(null);
  const [editing, setEditing] = React.useState<PlannerTask | null>(null);
  const [order, setOrder] = React.useState<string[]>(() =>
    sortPlannerTasks(
      initialTasks.filter((task) => task.date === initialDate),
    ).map((task) => task.id),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const loadWeek = React.useCallback(async (weekStart: string) => {
    setIsLoading(true);
    const weekEnd = dateKey(addDays(parseISO(`${weekStart}T12:00:00`), 6));
    try {
      const { tasks: loaded } = await getPlannerTasksBetween(
        weekStart,
        weekEnd,
      );
      setTasks(loaded);
      setLoadedWeekStart(weekStart);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load planner",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectDate = async (date: string) => {
    setSelectedDate(date);
    const targetWeekStart = weekStartOf(date);
    if (targetWeekStart !== loadedWeekStart) {
      await loadWeek(targetWeekStart);
    }
  };

  const changeWeek = (offset: number) => {
    const nextSelected = dateKey(
      addDays(parseISO(`${selectedDate}T12:00:00`), offset * 7),
    );
    setSelectedDate(nextSelected);
    void loadWeek(
      dateKey(addDays(parseISO(`${loadedWeekStart}T12:00:00`), offset * 7)),
    );
  };

  const date = parseISO(`${selectedDate}T12:00:00`);
  const dayTasks = React.useMemo(
    () =>
      sortPlannerTasks(
        tasks.filter((task) => task.date === selectedDate),
      ),
    [tasks, selectedDate],
  );
  const orderedDayTasks = React.useMemo(() => {
    const dayIds = dayTasks.map((task) => task.id);
    const kept = order.filter((id) => dayIds.includes(id));
    const added = dayIds.filter((id) => !kept.includes(id));
    return [...kept, ...added];
  }, [order, dayTasks]);
  const sortedTasks = orderedDayTasks
    .map((id) => dayTasks.find((task) => task.id === id))
    .filter((task): task is PlannerTask => Boolean(task));
  const completedCount = dayTasks.filter(
    (task) => task.status === "done",
  ).length;
  const totalTaskCount = dayTasks.length;
  const activeCount = dayTasks.filter(
    (task) => task.status !== "done" && task.status !== "skipped",
  ).length;
  const scheduledMinutes = dayTasks.reduce(
    (total, task) => total + (task.durationMinutes ?? 0),
    0,
  );

  const updateStatus = async (task: PlannerTask, status: PlannerStatus) => {
    const previous = tasks;
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, status } : item,
      ),
    );
    const result = await updatePlannerTask(task.id, { status });
    if ("error" in result) {
      setTasks(previous);
      toast.error(result.error);
    }
  };

  const deleteTask = async (task: PlannerTask) => {
    const previous = tasks;
    const previousOrder = order;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setOrder((current) => current.filter((id) => id !== task.id));
    const result = await deletePlannerTask(task.id);
    if (result.error) {
      setTasks(previous);
      setOrder(previousOrder);
      toast.error(result.error);
    }
  };

  const moveTaskToNextDay = async (task: PlannerTask) => {
    const previous = tasks;
    const nextDate = dateKey(addDays(date, 1));
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, date: nextDate, status: "planned" }
          : item,
      ),
    );
    const result = await movePlannerTaskToDate(task.id, nextDate);
    if ("error" in result) {
      setTasks(previous);
      toast.error(result.error);
    } else {
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? result.task : item)),
      );
      toast.success("Task moved to tomorrow");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedDayTasks.indexOf(active.id as string);
    const newIndex = orderedDayTasks.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(orderedDayTasks, oldIndex, newIndex);
    setOrder(reordered);
    reorderPlannerTasks(reordered).then((result) => {
      if ("error" in result) toast.error(result.error);
    });
  };

  const updateTask = (updated: PlannerTask) => {
    setTasks((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const addTaskToDay = (task: PlannerTask) => {
    setTasks((current) => [...current, task]);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <PlannerHeader
        date={date}
        onChangeDate={(offset) =>
          void selectDate(dateKey(addDays(date, offset)))
        }
        onToday={() => void selectDate(today)}
      />

      <WeekStrip
        weekStart={loadedWeekStart}
        selectedDate={selectedDate}
        today={today}
        tasks={tasks}
        isLoading={isLoading}
        onSelectDate={(value) => void selectDate(value)}
        onChangeWeek={changeWeek}
        onThisWeek={() => void selectDate(today)}
        onTaskCreated={addTaskToDay}
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <PlannerStatsSidebar
          isLoading={isLoading}
          completedCount={completedCount}
          totalTaskCount={totalTaskCount}
          activeCount={activeCount}
          scheduledMinutes={scheduledMinutes}
        />
        <PlannerTaskManagement
          selectedDate={selectedDate}
          isLoading={isLoading}
          sortedTasks={sortedTasks}
          sensors={sensors}
          onTaskCreated={addTaskToDay}
          onDragEnd={handleDragEnd}
          onStatusChange={updateStatus}
          onDeleteTask={setToDelete}
          onMoveTask={moveTaskToNextDay}
          onEditTask={setEditing}
        />
      </div>

      <footer className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4 shrink-0" />
        <span>
          Time blocks are guidance, not a contract. Keep the list short enough
          to finish.
        </span>
      </footer>

      <DeletePlannerTaskDialog
        task={toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const task = toDelete;
          setToDelete(null);
          void deleteTask(task);
        }}
      />

      <EditTaskDialog
        task={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onUpdated={updateTask}
      />
    </div>
  );
}
