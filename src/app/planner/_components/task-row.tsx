"use client";

import { format, parseISO, subDays } from "date-fns";
import { MoveLeft, MoveRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  PlannerPriority,
  PlannerTask,
  PlannerStatus,
} from "@/lib/planner-types";
import { usePlannerStore } from "@/stores/planner.store";
import { runPlannerAction } from "./planner-feedback";
import { TaskStatusButton } from "./task-status-button";

const statusLabels: Record<PlannerStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

const priorityStyles: Record<PlannerPriority, string> = {
  low: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  medium:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  high: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function formatTime(value: string | null): string {
  if (!value) return "Anytime";
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return format(date, "h:mm a");
}

export function TaskRow({ task }: { task: PlannerTask }) {
  const today = usePlannerStore((s) => s.today);
  const moveTaskToNextDay = usePlannerStore((s) => s.moveTaskToNextDay);
  const moveTaskToYesterday = usePlannerStore((s) => s.moveTaskToYesterday);
  const openEditTask = usePlannerStore((s) => s.openEditTask);
  const requestDeleteTask = usePlannerStore((s) => s.requestDeleteTask);

  const previousDayKey = task.date
    ? toKey(subDays(parseISO(`${task.date}T12:00:00`), 1))
    : "";
  const canMoveToYesterday = Boolean(previousDayKey) && task.date !== today;

  const terminal = task.status === "done" || task.status === "skipped";

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-3 transition-colors hover:border-foreground/20 sm:grid-cols-[5rem_auto_minmax(0,1fr)_auto] sm:items-center sm:gap-y-3",
        terminal && "opacity-65",
      )}
    >
      <div className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
        {formatTime(task.startTime)}
      </div>
      <div className="col-start-1 row-start-1 sm:col-auto sm:row-auto">
        <TaskStatusButton task={task} />
      </div>
      <div className="col-start-2 row-start-1 min-w-0 sm:col-auto sm:row-auto">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium",
              terminal && "line-through",
            )}
          >
            {task.title}
          </p>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              priorityStyles[task.priority],
            )}
          >
            {task.priority}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="sm:hidden">{formatTime(task.startTime)}</span>
          <span>{statusLabels[task.status]}</span>
          {task.durationMinutes && <span>{task.durationMinutes} min</span>}
          {task.notes && <span className="truncate">{task.notes}</span>}
        </div>
      </div>
      <div className="col-span-2 row-start-2 mt-1 flex items-center justify-end gap-1 border-t pt-2 sm:col-auto sm:row-auto sm:mt-0 sm:border-t-0 sm:pt-0 sm:opacity-70 sm:transition-opacity sm:group-hover:opacity-100">
        {task.status !== "done" && task.status !== "skipped" && (
          <>
            {canMoveToYesterday && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() =>
                  runPlannerAction(moveTaskToYesterday(task.id), {
                    success: `Task moved to ${format(
                      parseISO(`${previousDayKey}T12:00:00`),
                      "EEE, MMM d",
                    )}`,
                    fallback: "Failed to move task",
                  })
                }
                aria-label="Move to yesterday"
                title="Move to yesterday"
              >
                <MoveLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() =>
                runPlannerAction(moveTaskToNextDay(task.id), {
                  success: "Task moved to tomorrow",
                  fallback: "Failed to move task",
                })
              }
              aria-label="Move to tomorrow"
              title="Move to tomorrow"
            >
              <MoveRight className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => openEditTask(task.id)}
          aria-label="Edit task"
          title="Edit task"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive"
          onClick={() => requestDeleteTask(task.id)}
          aria-label="Delete task"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
