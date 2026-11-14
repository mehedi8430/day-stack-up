"use client";

import * as React from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  formatFocusElapsed,
  getPomodoroRemainingSeconds,
} from "@/lib/focus-timer";
import type { PomodoroPhase } from "@/lib/focus-types";
import { useFocusStore } from "@/stores/focus.store";
import { useFocusClock } from "./use-focus-elapsed";

const presets = [
  {
    label: "Classic",
    description: "25 min focus · 5 min break",
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
  },
  {
    label: "Long focus",
    description: "50 min focus · 10 min break",
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 30,
  },
] as const;

function phaseName(phase: PomodoroPhase): string {
  if (phase === "focus") return "Focus";
  return phase === "long_break" ? "Long break" : "Short break";
}

export function FocusPomodoroDialog() {
  const activeSession = useFocusStore((state) => state.activeSession);
  const open = useFocusStore((state) => state.pomodoroDialogOpen);
  const setOpen = useFocusStore((state) => state.setPomodoroDialogOpen);
  const isMutating = useFocusStore((state) => state.isMutating);
  const startPomodoro = useFocusStore((state) => state.startPomodoro);
  const pause = useFocusStore((state) => state.pause);
  const resume = useFocusStore((state) => state.resume);
  const advancePomodoro = useFocusStore((state) => state.advancePomodoro);
  const stopPomodoro = useFocusStore((state) => state.stopPomodoro);
  const [presetIndex, setPresetIndex] = React.useState(0);
  const transitionSession = React.useRef<string | null>(null);
  const now = useFocusClock(activeSession);

  React.useEffect(() => {
    if (
      !activeSession?.pomodoroEnabled ||
      activeSession.pomodoroPhase !== "focus" ||
      !activeSession.pomodoroPhaseEndsAt
    ) {
      return;
    }
    transitionSession.current = null;

    const timer = window.setInterval(() => {
      const state = useFocusStore.getState();
      const current = state.activeSession;
      if (
        state.isMutating ||
        !current ||
        current.id !== activeSession.id ||
        current.pomodoroPhase !== "focus" ||
        !current.pomodoroPhaseEndsAt ||
        Date.parse(current.pomodoroPhaseEndsAt) > Date.now() ||
        transitionSession.current === current.id
      ) {
        return;
      }

      transitionSession.current = current.id;
      void advancePomodoro().then(
        () => {
          window.setTimeout(() => {
            if (transitionSession.current === current.id) {
              transitionSession.current = null;
            }
          }, 1000);
        },
        (error: unknown) =>
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to start the Pomodoro break",
          ),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [
    activeSession?.id,
    activeSession?.pomodoroEnabled,
    activeSession?.pomodoroPhase,
    activeSession?.pomodoroPhaseEndsAt,
    advancePomodoro,
  ]);

  if (!activeSession) return null;

  const isPomodoro = activeSession.pomodoroEnabled;
  const phase = activeSession.pomodoroPhase;
  const remaining = isPomodoro
    ? (getPomodoroRemainingSeconds(
        activeSession.pomodoroPhaseEndsAt,
        activeSession.pomodoroRemainingSeconds,
        now,
      ) ?? 0)
    : null;
  const phaseDuration =
    phase === "focus"
      ? activeSession.pomodoroFocusMinutes * 60
      : phase === "long_break"
        ? activeSession.pomodoroLongBreakMinutes * 60
        : activeSession.pomodoroShortBreakMinutes * 60;
  const progress = isPomodoro && remaining !== null
    ? Math.min(
        100,
        Math.max(0, ((phaseDuration - remaining) / phaseDuration) * 100),
      )
    : 0;
  const breakPhase = phase === "short_break" || phase === "long_break";
  const phaseTimerRunning = Boolean(activeSession.pomodoroPhaseEndsAt);
  const cycleCount =
    activeSession.pomodoroCompletedCount === 0
      ? 0
      : ((activeSession.pomodoroCompletedCount - 1) % 4) + 1;

  const runAction = (
    action: Promise<void>,
    fallback: string,
    success?: string,
  ) => {
    void action.then(
      () => {
        if (success) toast.success(success);
      },
      (error: unknown) =>
        toast.error(error instanceof Error ? error.message : fallback),
    );
  };

  const selectedPreset = presets[presetIndex];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pomodoro focus</DialogTitle>
          <DialogDescription className="truncate">
            {activeSession.taskTitle}
          </DialogDescription>
        </DialogHeader>

        {!isPomodoro ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pomodoro runs on this task&apos;s focus session. Breaks are
              excluded from the planner&apos;s tracked work time.
            </p>
            <div className="grid gap-2">
              {presets.map((preset, index) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPresetIndex(index)}
                  aria-pressed={presetIndex === index}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    presetIndex === index
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {preset.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {preset.description}; long break after 4 sessions
                  </span>
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={isMutating}
              onClick={() =>
                runAction(
                  startPomodoro(selectedPreset),
                  "Failed to start Pomodoro",
                  "Pomodoro started",
                )
              }
            >
              <Play className="mr-2 h-4 w-4" />
              Start Pomodoro
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {phase ? phaseName(phase) : "Pomodoro"}
              </p>
              <p
                role="timer"
                aria-live="off"
                className="my-2 text-6xl font-semibold tabular-nums tracking-tight"
              >
                {remaining === null ? "--:--" : formatFocusElapsed(remaining)}
              </p>
              <div
                role="progressbar"
                aria-label={`${phase ? phaseName(phase) : "Pomodoro"} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span>Completed focus sessions</span>
              <span className="font-semibold tabular-nums">
                {activeSession.pomodoroCompletedCount} total · {cycleCount} / 4
              </span>
            </div>

            {breakPhase && remaining === 0 ? (
              <Button
                className="w-full"
                disabled={isMutating}
                onClick={() =>
                  runAction(
                    resume(true),
                    "Failed to start the next focus session",
                    "Next focus session started",
                  )
                }
              >
                <Play className="mr-2 h-4 w-4" />
                Start next focus
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="secondary"
                  disabled={isMutating}
                  onClick={() =>
                    runAction(
                      phaseTimerRunning
                        ? pause()
                        : resume(),
                      "Failed to update Pomodoro timer",
                    )
                  }
                >
                  {phaseTimerRunning ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {phaseTimerRunning
                    ? "Pause"
                    : breakPhase
                      ? "Resume break"
                      : "Resume focus"}
                </Button>
                {breakPhase && (
                  <Button
                    variant="outline"
                    disabled={isMutating}
                    onClick={() =>
                      runAction(
                        resume(true),
                        "Failed to skip break",
                        "Focus session started",
                      )
                    }
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip break
                  </Button>
                )}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={isMutating}
              onClick={() =>
                runAction(
                  stopPomodoro(),
                  "Failed to switch to the count-up timer",
                  "Switched to the count-up timer",
                )
              }
            >
              Switch to count-up timer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
