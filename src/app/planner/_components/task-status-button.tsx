"use client";

import { Check, Circle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannerTask, PlannerStatus } from "@/lib/planner-types";
import { usePlannerStore } from "@/stores/planner.store";
import { runPlannerAction } from "./planner-feedback";

const statusLabels: Record<PlannerStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

export function TaskStatusButton({ task }: { task: PlannerTask }) {
  const setTaskStatus = usePlannerStore((s) => s.setTaskStatus);
  const nextStatus: PlannerStatus =
    task.status === "planned"
      ? "in_progress"
      : task.status === "in_progress"
        ? "done"
        : "planned";
  const Icon = task.status === "done" ? Check : task.status === "in_progress" ? Play : Circle;

  return (
    <button
      type="button"
      onClick={() =>
        runPlannerAction(setTaskStatus(task.id, nextStatus), {
          fallback: "Failed to update task",
        })
      }
      aria-label={`${statusLabels[task.status]}. Set ${statusLabels[nextStatus]}`}
      title={`Set ${statusLabels[nextStatus]}`}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        task.status === "done" && "border-emerald-500 bg-emerald-500 text-white",
        task.status === "in_progress" && "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950",
        task.status === "planned" && "border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground",
        task.status === "skipped" && "border-muted-foreground/30 text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
