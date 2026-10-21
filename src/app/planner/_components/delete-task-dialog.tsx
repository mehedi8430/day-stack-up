"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePlannerStore } from "@/stores/planner.store";
import { runPlannerAction } from "./planner-feedback";

export function DeleteTaskDialog() {
  const task = usePlannerStore(
    (s) => s.tasks.find((item) => item.id === s.deletingTaskId) ?? null,
  );
  const closeDeleteTask = usePlannerStore((s) => s.closeDeleteTask);
  const deleteTask = usePlannerStore((s) => s.deleteTask);

  return (
    <ConfirmDialog
      open={!!task}
      onOpenChange={(open) => {
        if (!open) closeDeleteTask();
      }}
      title="Delete task?"
      description={
        <>
          This will permanently remove{" "}
          <span className="font-semibold">{task?.title}</span> from your
          planner. This action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      onConfirm={() => {
        if (!task) return;
        closeDeleteTask();
        runPlannerAction(deleteTask(task.id), {
          fallback: "Failed to delete task",
        });
      }}
    />
  );
}
