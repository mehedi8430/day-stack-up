"use client";

import * as React from "react";
import { getElapsedSeconds } from "@/lib/focus-timer";
import type { FocusSession } from "@/lib/focus-types";

let clockNow = 0;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function subscribeToClock(listener: () => void): () => void {
  clockNow = Date.now();
  clockListeners.add(listener);

  if (clockTimer === null) {
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      for (const notify of clockListeners) notify();
    }, 1000);
  }

  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function getClockSnapshot(): number {
  if (clockNow === 0) clockNow = Date.now();
  return clockNow;
}

function getServerClockSnapshot(): number {
  return 0;
}

function subscribeToNothing(): () => void {
  return () => {};
}

export function useFocusClock(session: FocusSession | null): number {
  const isPomodoroBreakRunning = Boolean(
    session?.pomodoroEnabled &&
      (session.pomodoroPhase === "short_break" ||
        session.pomodoroPhase === "long_break") &&
      session.pomodoroPhaseEndsAt,
  );
  const shouldTick = session?.status === "running" || isPomodoroBreakRunning;
  return React.useSyncExternalStore(
    shouldTick ? subscribeToClock : subscribeToNothing,
    getClockSnapshot,
    getServerClockSnapshot,
  );
}

export function useFocusElapsed(session: FocusSession | null): number {
  const now = useFocusClock(session);

  if (!session) return 0;
  if (session.status !== "running") return getElapsedSeconds(session, 0);

  const segmentStart = session.segmentStartedAt
    ? Date.parse(session.segmentStartedAt)
    : NaN;
  const reference =
    now > 0 ? now : Number.isNaN(segmentStart) ? 0 : segmentStart;

  return getElapsedSeconds(session, reference);
}
