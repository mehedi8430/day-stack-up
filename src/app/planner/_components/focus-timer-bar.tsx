"use client";

import { Pause, Play, Square, Timer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  formatFocusElapsed,
  getPomodoroRemainingSeconds,
} from "@/lib/focus-timer";
import { useFocusStore } from "@/stores/focus.store";
import { cn } from "@/lib/utils";
import { runPlannerAction } from "./planner-feedback";
import { useFocusClock, useFocusElapsed } from "./use-focus-elapsed";

export function FocusTimerBar() {
  const activeSession = useFocusStore((s) => s.activeSession);
  const isMutating = useFocusStore((s) => s.isMutating);
  const pause = useFocusStore((s) => s.pause);
  const resume = useFocusStore((s) => s.resume);
  const requestFinish = useFocusStore((s) => s.requestFinish);
  const setPomodoroDialogOpen = useFocusStore(
    (s) => s.setPomodoroDialogOpen,
  );
  const elapsed = useFocusElapsed(activeSession);
  const now = useFocusClock(activeSession);

  if (!activeSession) return null;

  const running = activeSession.status === "running";
  const isPomodoroBreak =
    activeSession.pomodoroEnabled &&
    (activeSession.pomodoroPhase === "short_break" ||
      activeSession.pomodoroPhase === "long_break");
  const breakRemaining = isPomodoroBreak
    ? getPomodoroRemainingSeconds(
        activeSession.pomodoroPhaseEndsAt,
        activeSession.pomodoroRemainingSeconds,
        now,
      )
    : null;
  const timerRunning =
    running || (isPomodoroBreak && breakRemaining !== null && breakRemaining > 0);

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Focus timer for ${activeSession.taskTitle}, ${
        timerRunning ? "running" : "paused"
      }`}
      className="fixed inset-x-3 bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[min(28rem,calc(100vw-3rem))] sm:max-w-none"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          isPomodoroBreak
            ? "bg-amber-500"
            : running
              ? "bg-emerald-500"
              : "bg-amber-500",
        )}
      />
      <div className="min-w-0">
        <Link
          href={`/planner?date=${activeSession.taskDate}`}
          className="block max-w-44 truncate text-left text-sm font-medium hover:underline sm:max-w-60"
          title="Open the focused task's date"
        >
          {activeSession.taskTitle}
        </Link>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {activeSession.pomodoroEnabled
            ? activeSession.pomodoroPhase === "focus"
              ? "Pomodoro · Focus"
              : activeSession.pomodoroPhase === "long_break"
                ? "Pomodoro · Long break"
                : "Pomodoro · Short break"
            : running
              ? "Focusing"
              : "Paused"}
        </p>
      </div>
      <span className="ml-auto text-sm font-semibold tabular-nums">
        {formatFocusElapsed(elapsed)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setPomodoroDialogOpen(true)}
        disabled={isMutating}
        aria-label={
          activeSession.pomodoroEnabled
            ? "Open Pomodoro timer"
            : "Set up Pomodoro timer"
        }
        title={
          activeSession.pomodoroEnabled
            ? "Open Pomodoro timer"
            : "Set up Pomodoro timer"
        }
      >
        <Timer className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() =>
          runPlannerAction(timerRunning ? pause() : resume(), {
            fallback: "Failed to update focus timer",
          })
        }
        disabled={isMutating}
        aria-label={
          timerRunning
            ? isPomodoroBreak
              ? "Pause Pomodoro break"
              : "Pause focus timer"
            : isPomodoroBreak
              ? breakRemaining === 0
                ? "Start next focus session"
                : "Resume Pomodoro break"
              : "Resume focus timer"
        }
        title={
          timerRunning
            ? isPomodoroBreak
              ? "Pause Pomodoro break"
              : "Pause focus timer"
            : isPomodoroBreak
              ? breakRemaining === 0
                ? "Start next focus session"
                : "Resume Pomodoro break"
              : "Resume focus timer"
        }
      >
        {timerRunning ? (
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
