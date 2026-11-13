import type { PlannerTaskPatch } from "./planner-types";

export type FocusSessionStatus = "running" | "paused" | "completed";

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  taskDate: string;
  status: FocusSessionStatus;
  startedAt: string;
  segmentStartedAt: string | null;
  endedAt: string | null;
  accumulatedSeconds: number;
  reportedSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface FocusMutationResult {
  session: FocusSession;
  taskUpdates: PlannerTaskPatch[];
}
