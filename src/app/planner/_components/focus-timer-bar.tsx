"use client";

import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFocusElapsed } from "@/lib/focus-timer";
import { useFocusStore } from "@/stores/focus.store";
import { usePlannerStore } from "@/stores/planner.store";
import { cn } from "@/lib/utils";
import { runPlannerAction } from "./planner-feedback";
import { useFocusElapsed } from "./use-focus-elapsed";

export function FocusTimerBar() {
  const activeSession = useFocusStore((s) => s.activeSession);
  const isMutating = useFocusStore((s) => s.isMutating);
  const pause = useFocusStore((s) => s.pause);
  const resume = useFocusStore((s) => s.resume);
  const requestFinish = useFocusStore((s) => s.requestFinish);
  const selectDate = usePlannerStore((s) => s.selectDate);
  const selectedDate = usePlannerStore((s) => s.selectedDate);
  const elapsed = useFocusElapsed(activeSession);

  if (!activeSession) return null;

  const running = activeSession.status === "running";

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Focus timer for ${activeSession.taskTitle}, ${
        running ? "running" : "paused"
      }`}
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          running ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => {
            if (activeSession.taskDate === selectedDate) return;
            runPlannerAction(selectDate(activeSession.taskDate), {
              fallback: "Failed to open the focused task",
            });
          }}
          className="block max-w-44 truncate text-left text-sm font-medium hover:underline sm:max-w-60"
          title="Go to the focused task's date"
        >
          {activeSession.taskTitle}
        </button>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {running ? "Focusing" : "Paused"}
        </p>
      </div>
      <span className="ml-auto text-sm font-semibold tabular-nums">
        {formatFocusElapsed(elapsed)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
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
        className="h-8 w-8"
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
