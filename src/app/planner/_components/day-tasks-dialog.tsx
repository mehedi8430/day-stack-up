"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle2, MoveRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlannerStatus, PlannerTask } from "@/lib/planner-types";
import { NewTaskForm } from "./new-task-form";
import { TaskStatusButton } from "./task-status-button";
import { formatTime } from "./task-row";

export function DayTasksDialog({
  date,
  open,
  tasks,
  onOpenChange,
  onTaskCreated,
  onStatusChange,
  onDeleteTask,
  onMoveTask,
  onEditTask,
}: {
  date: string | null;
  open: boolean;
  tasks: PlannerTask[];
  onOpenChange: (open: boolean) => void;
  onTaskCreated: (task: PlannerTask) => void;
  onStatusChange: (task: PlannerTask, status: PlannerStatus) => void;
  onDeleteTask: (task: PlannerTask) => void;
  onMoveTask: (task: PlannerTask) => void;
  onEditTask: (task: PlannerTask) => void;
}) {
  const label = date
    ? format(parseISO(`${date}T12:00:00`), "EEEE, MMMM d")
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[950px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Add a task or manage everything scheduled for this day.
          </DialogDescription>
        </DialogHeader>

        {date && (
          <div className="space-y-5">
            <NewTaskForm date={date} onCreated={onTaskCreated} />

            <section className="space-y-3" aria-label="Tasks for this day">
              <h3 className="text-sm font-semibold">Tasks</h3>
              {tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nothing scheduled yet.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task) => {
                    const terminal =
                      task.status === "done" || task.status === "skipped";
                    return (
                      <li
                        key={task.id}
                        className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                      >
                        <TaskStatusButton
                          task={task}
                          onChange={(status) => onStatusChange(task, status)}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${
                              terminal ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTime(task.startTime)}</span>
                            <span className="uppercase tracking-wide">
                              {task.priority}
                            </span>
                            {task.durationMinutes ? (
                              <span>{task.durationMinutes} min</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!terminal && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onMoveTask(task)}
                              aria-label="Move to tomorrow"
                              title="Move to tomorrow"
                            >
                              <MoveRight className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEditTask(task)}
                            aria-label="Edit task"
                            title="Edit task"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onDeleteTask(task)}
                            aria-label="Delete task"
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
