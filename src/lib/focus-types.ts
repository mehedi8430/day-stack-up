import type { PlannerStatus, PlannerTaskPatch } from "./planner-types";

export type FocusSessionStatus = "running" | "paused" | "completed";
export type PomodoroPhase = "focus" | "short_break" | "long_break";

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  taskDate: string;
  taskStatus: PlannerStatus;
  status: FocusSessionStatus;
  startedAt: string;
  segmentStartedAt: string | null;
  endedAt: string | null;
  accumulatedSeconds: number;
  reportedSeconds: number;
  pomodoroEnabled: boolean;
  pomodoroPhase: PomodoroPhase | null;
  pomodoroPhaseEndsAt: string | null;
  pomodoroRemainingSeconds: number | null;
  pomodoroFocusMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  pomodoroCompletedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FocusMutationResult {
  session: FocusSession;
  taskUpdates: PlannerTaskPatch[];
}
