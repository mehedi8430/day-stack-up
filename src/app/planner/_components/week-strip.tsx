"use client";

import * as React from "react";
import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerStatus, PlannerTask } from "@/lib/planner-types";
import { sortPlannerTasks } from "@/lib/planner-utils";
import { DayTasksDialog } from "./day-tasks-dialog";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_PREVIEW = 3;

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function WeekStrip({
  weekStart,
  selectedDate,
  today,
  tasks,
  isLoading,
  onSelectDate,
  onChangeWeek,
  onThisWeek,
  onTaskCreated,
  onClose,
  onStatusChange,
  onDeleteTask,
  onMoveTask,
  onEditTask,
}: {
  weekStart: string;
  selectedDate: string;
  today: string;
  tasks: PlannerTask[];
  isLoading: boolean;
  onSelectDate: (date: string) => void;
  onChangeWeek: (offset: number) => void;
  onThisWeek: () => void;
  onTaskCreated: (task: PlannerTask) => void;
  onClose: () => void;
  onStatusChange: (task: PlannerTask, status: PlannerStatus) => void;
  onDeleteTask: (task: PlannerTask) => void;
  onMoveTask: (task: PlannerTask) => void;
  onEditTask: (task: PlannerTask) => void;
}) {
  const [activeDate, setActiveDate] = React.useState<string | null>(null);
  const activeTasks = activeDate
    ? sortPlannerTasks(tasks.filter((task) => task.date === activeDate))
    : [];
  const start = parseISO(`${weekStart}T12:00:00`);
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <section
      className="rounded-xl border bg-card p-4 shadow-sm"
      aria-label="Week planner"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          See your whole week at a glance. Click a day to open it below, or add
          a task directly from any day.
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close weekly planner"
          title="Close weekly planner"
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">This week</h2>
          <p className="text-sm text-muted-foreground">
            {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChangeWeek(-1)}
            aria-label="Previous week"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={onThisWeek}>
            This week
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChangeWeek(1)}
            aria-label="Next week"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={`flex gap-2 overflow-x-auto pb-1 ${isLoading ? "opacity-60" : ""}`}
        aria-busy={isLoading}
      >
        {days.map((day, index) => {
          const key = dateKey(day);
          const selected = key === selectedDate;
          const isToday = key === today;
          const dayTasks = sortPlannerTasks(
            tasks.filter((task) => task.date === key),
          );
          const preview = dayTasks.slice(0, MAX_PREVIEW);
          const moreCount = dayTasks.length - preview.length;
          const completed = dayTasks.filter(
            (task) => task.status === "done",
          ).length;

          return (
            <div
              key={key}
              className={`flex min-w-38 flex-1 flex-col rounded-lg border p-2.5 ${
                selected
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-muted"
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelectDate(key)}
                className="mb-2 flex items-center justify-between gap-1 rounded-md px-1 py-1 text-left hover:bg-muted/60 cursor-pointer"
                aria-label={`Open ${format(day, "EEEE MMM d")}`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {weekdayLabels[index]}
                  </p>
                  <p
                    className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}
                  >
                    {format(day, "d")}
                  </p>
                </div>
                {dayTasks.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {completed}/{dayTasks.length}
                  </span>
                )}
              </button>

              <div className="flex-1 space-y-1">
                {preview.length === 0 ? (
                  <p className="rounded-md border border-dashed px-2 py-2 text-center text-[11px] text-muted-foreground">
                    No tasks
                  </p>
                ) : (
                  preview.map((task) => (
                    <p
                      key={task.id}
                      className={`truncate rounded-md border-l-2 bg-muted/40 px-2 py-1 text-xs ${
                        task.status === "done"
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                  ))
                )}
                {moreCount > 0 && (
                  <p className="px-1 text-[11px] font-medium text-muted-foreground">
                    +{moreCount} more
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1"
                onClick={() => setActiveDate(key)}
              >
                <Plus className="h-4 w-4" />
                Add task
              </Button>
            </div>
          );
        })}
      </div>

      <DayTasksDialog
        date={activeDate}
        open={activeDate !== null}
        tasks={activeTasks}
        onOpenChange={(open) => {
          if (!open) setActiveDate(null);
        }}
        onTaskCreated={onTaskCreated}
        onStatusChange={onStatusChange}
        onDeleteTask={onDeleteTask}
        onMoveTask={onMoveTask}
        onEditTask={onEditTask}
      />
    </section>
  );
}
