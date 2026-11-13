"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFocusElapsed } from "@/lib/focus-timer";
import type { FocusSession } from "@/lib/focus-types";
import type { PlannerTask } from "@/lib/planner-types";
import { useFocusStore } from "@/stores/focus.store";
import { usePlannerStore } from "@/stores/planner.store";
import { useFocusElapsed } from "./use-focus-elapsed";

export function SwitchFocusDialog() {
  const activeSession = useFocusStore((s) => s.activeSession);
  const pendingSwitchTaskId = useFocusStore((s) => s.pendingSwitchTaskId);
  const isMutating = useFocusStore((s) => s.isMutating);
  const confirmSwitch = useFocusStore((s) => s.confirmSwitch);
  const cancelSwitch = useFocusStore((s) => s.cancelSwitch);
  const pendingTask = usePlannerStore((s) =>
    pendingSwitchTaskId
      ? (s.tasks.find((task) => task.id === pendingSwitchTaskId) ?? null)
      : null,
  );

  return (
    <ConfirmDialog
      open={Boolean(activeSession && pendingSwitchTaskId)}
      onOpenChange={(open) => {
        if (!open && !isMutating) cancelSwitch();
      }}
      title="Switch focus?"
      description={
        <>
          A focus timer is running on{" "}
          <strong className="font-semibold text-foreground">
            {activeSession?.taskTitle}
          </strong>
          . Starting{" "}
          <strong className="font-semibold text-foreground">
            {pendingTask?.title ?? "the new task"}
          </strong>{" "}
          will pause it and keep its tracked time.
        </>
      }
      confirmLabel="Switch focus"
      cancelLabel="Keep current timer"
      variant="default"
      confirmDisabled={isMutating}
      cancelDisabled={isMutating}
      onConfirm={() => {
        void confirmSwitch().catch((error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to switch focus",
          );
        });
      }}
    />
  );
}

function FinishFocusForm({
  session,
  task,
}: {
  session: FocusSession;
  task: PlannerTask | null;
}) {
  const isMutating = useFocusStore((s) => s.isMutating);
  const confirmFinish = useFocusStore((s) => s.confirmFinish);
  const cancelFinish = useFocusStore((s) => s.cancelFinish);
  const elapsed = useFocusElapsed(session);
  const alreadyDone = task?.status === "done";
  const [markDone, setMarkDone] = React.useState(alreadyDone);

  const handleFinish = async () => {
    try {
      await confirmFinish(markDone);
      toast.success("Focus time saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save focus time",
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Finish focus session?</DialogTitle>
        <DialogDescription>
          Your tracked time will be saved. Marking the task done is optional.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="truncate text-sm font-medium">{session.taskTitle}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {formatFocusElapsed(elapsed)}
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={markDone}
          onChange={(event) => setMarkDone(event.target.checked)}
          disabled={isMutating || alreadyDone}
          className="mt-0.5 size-4 rounded border-input accent-primary"
        />
        <span>
          Mark this task as done
          {alreadyDone && (
            <span className="block text-xs text-muted-foreground">
              This task is already done.
            </span>
          )}
        </span>
      </label>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={cancelFinish}
          disabled={isMutating}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleFinish()}
          disabled={isMutating}
        >
          Save time
        </Button>
      </DialogFooter>
    </>
  );
}

export function FinishFocusDialog() {
  const activeSession = useFocusStore((s) => s.activeSession);
  const finishingSessionId = useFocusStore((s) => s.finishingSessionId);
  const isMutating = useFocusStore((s) => s.isMutating);
  const cancelFinish = useFocusStore((s) => s.cancelFinish);
  const task = usePlannerStore((s) =>
    activeSession
      ? (s.tasks.find((item) => item.id === activeSession.taskId) ?? null)
      : null,
  );

  return (
    <Dialog
      open={Boolean(activeSession && finishingSessionId)}
      onOpenChange={(open) => {
        if (!open && !isMutating) cancelFinish();
      }}
    >
      <DialogContent>
        {activeSession && (
          <FinishFocusForm
            key={activeSession.id}
            session={activeSession}
            task={task}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
