export type PlannerStatus = "planned" | "in_progress" | "done" | "skipped";
export type PlannerPriority = "low" | "medium" | "high";

export interface PlannerTask {
  id: string;
  userId: string;
  title: string;
  date: string;
  startTime: string | null;
  durationMinutes: number | null;
  priority: PlannerPriority;
  status: PlannerStatus;
  notes: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
