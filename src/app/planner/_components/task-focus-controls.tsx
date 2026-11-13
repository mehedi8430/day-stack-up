"use client";

import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFocusElapsed } from "@/lib/focus-timer";
import type { PlannerTask } from "@/lib/planner-types";
import { useFocusStore } from "@/stores/focus.store";
import { runPlannerAction } from "./planner-feedback";
import { useFocusElapsed } from "./use-focus-elapsed";

export function TaskFocusControls({
  task,
  compact = false,
}: {
  task: PlannerTask;
  compact?: boolean;
}) {
  const activeSession = useFocusStore((s) => s.activeSession);
  const isMutating = useFocusStore((s) => s.isMutating);
  const requestStart = useFocusStore((s) => s.requestStart);
  const pause = useFocusStore((s) => s.pause);
  const resume = useFocusStore((s) => s.resume);
  const requestFinish = useFocusStore((s) => s.requestFinish);

  const isActive =
    activeSession?.taskId === task.id && activeSession.status !== "completed";
  const elapsed = useFocusElapsed(isActive ? activeSession : null);
  const iconClass = compact ? "h-8 w-8" : "h-9 w-9";
  const terminal = task.status === "done" || task.status === "skipped";

  if (!isActive) {
    if (terminal) return null;

    return (
      <Button
        variant="ghost"
        size="icon"
        className={iconClass}
        onClick={() =>
          runPlannerAction(requestStart(task.id), {
            fallback: "Failed to start focus timer",
          })
        }
        disabled={isMutating}
        aria-label="Start focus timer"
        title="Start focus timer"
      >
        <Play className="h-4 w-4" />
      </Button>
    );
  }

  const running = activeSession.status === "running";

  return (
    <div className="flex items-center gap-1">
      {!compact && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatFocusElapsed(elapsed)}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={iconClass}
        onClick={() =>
          runPlannerAction(running ? pause() : resume(), {
            fallback: "Failed to update focus timer",
          })
        }
        disabled={isMutating}
        aria-label={running ? "Pause focus timer" : "Resume focus timer"}
        title={running ? "Pause focus timer" : "Resume focus timer"}
      >
        {running ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={iconClass}
        onClick={requestFinish}
        disabled={isMutating}
        aria-label="Finish focus session"
        title="Finish focus session"
      >
        <Square className="h-4 w-4" />
      </Button>
    </div>
  );
}
