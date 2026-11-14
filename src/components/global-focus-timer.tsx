"use client";

import * as React from "react";
import type { FocusSession } from "@/lib/focus-types";
import { useFocusStore } from "@/stores/focus.store";
import { FinishFocusDialog } from "@/app/planner/_components/focus-dialogs";
import { FocusTimerBar } from "@/app/planner/_components/focus-timer-bar";
import { FocusPomodoroDialog } from "@/app/planner/_components/focus-pomodoro-dialog";

export function GlobalFocusTimer({
  initialFocusSession,
}: {
  initialFocusSession: FocusSession | null;
}) {
  const initializeFocus = useFocusStore((state) => state.initialize);
  const resetFocus = useFocusStore((state) => state.reset);
  const activeFocusStatus = useFocusStore(
    (state) => state.activeSession?.status,
  );

  React.useEffect(() => {
    initializeFocus(initialFocusSession);
    return resetFocus;
  }, [initialFocusSession, initializeFocus, resetFocus]);

  React.useEffect(() => {
    if (activeFocusStatus !== "running") return;
    const timer = window.setInterval(() => {
      void useFocusStore.getState().heartbeat();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [activeFocusStatus]);

  return (
    <>
      <FocusTimerBar />
      <FinishFocusDialog />
      <FocusPomodoroDialog />
    </>
  );
}
