"use client";

import * as React from "react";
import { Clock3 } from "lucide-react";
import type { FocusSession } from "@/lib/focus-types";
import type { PlannerTask } from "@/lib/planner-types";
import { useFocusStore } from "@/stores/focus.store";
import { usePlannerStore } from "@/stores/planner.store";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import {
  FinishFocusDialog,
  SwitchFocusDialog,
} from "./focus-dialogs";
import { PlannerHeader } from "./planner-header";
import { PlannerStatsSidebar } from "./planner-stats-sidebar";
import { PlannerTaskManagement } from "./planner-task-management";
import { WeekStrip } from "./week-strip";

interface PlannerManagementProps {
  initialTasks: PlannerTask[];
  initialFocusSession: FocusSession | null;
  today: string;
  selectedDate: string;
  weekStart: string;
}

export function PlannerManagement({
  initialTasks,
  initialFocusSession,
  today,
  selectedDate,
  weekStart,
}: PlannerManagementProps) {
  const initialize = usePlannerStore((s) => s.initialize);
  const reset = usePlannerStore((s) => s.reset);
  const initializeFocus = useFocusStore((s) => s.initialize);
  const resetFocus = useFocusStore((s) => s.reset);
  const activeFocusStatus = useFocusStore((s) => s.activeSession?.status);
  const ready = usePlannerStore(
    (s) => s.initialized && Boolean(s.selectedDate),
  );
  const focusReady = useFocusStore((s) => s.initialized);
  const [showWeekStrip, setShowWeekStrip] = React.useState(false);

  const initialRef = React.useRef({
    initialTasks,
    initialFocusSession,
    today,
    selectedDate,
    weekStart,
  });

  React.useEffect(() => {
    const initial = initialRef.current;
    initialize(
      initial.initialTasks,
      initial.weekStart,
      initial.selectedDate,
      initial.today,
    );
    initializeFocus(initial.initialFocusSession);
    return () => {
      reset();
      resetFocus();
    };
  }, [initialize, initializeFocus, reset, resetFocus]);

  React.useEffect(() => {
    if (activeFocusStatus !== "running") return;
    const timer = window.setInterval(() => {
      void useFocusStore.getState().heartbeat();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [activeFocusStatus]);

  if (!ready || !focusReady) {
    return (
      <div
        className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"
        aria-busy="true"
        aria-label="Loading planner"
      >
        <div className="h-36 animate-pulse rounded-xl border bg-card" />
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="h-56 animate-pulse rounded-xl border bg-card" />
          <div className="h-96 animate-pulse rounded-xl border bg-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <PlannerHeader
        isWeekStripOpen={showWeekStrip}
        onOpenWeekStrip={() => setShowWeekStrip(true)}
      />
      {showWeekStrip && (
        <WeekStrip onClose={() => setShowWeekStrip(false)} />
      )}

      <div
        id="planner-tasks"
        className="grid scroll-mt-4 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
      >
        <PlannerStatsSidebar />
        <PlannerTaskManagement />
      </div>

      <footer className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4 shrink-0" />
        <span>
          Time blocks are guidance, not a contract. Keep the list short enough
          to finish.
        </span>
      </footer>

      <DeleteTaskDialog />
      <EditTaskDialog />
      <SwitchFocusDialog />
      <FinishFocusDialog />
    </div>
  );
}
