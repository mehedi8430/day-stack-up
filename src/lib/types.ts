export interface Habit {
  id: string;
  name: string;
  goal: string;
  notes: string | null;
  emoji?: string;
  category: string;
  order: number;
  createdAt: string; // ISO date
  /** Days per week this habit targets (1-7). 7 = every day. */
  weeklyTarget: number;
}

export type MilestoneStatus = "planned" | "in_progress" | "done" | "skipped";

export interface HabitMilestone {
  id: string;
  habitId: string;
  title: string;
  status: MilestoneStatus;
  startDate: string | null;
  targetDate: string | null;
  details: string;
  resources: string;
  order: number;
}

export const CATEGORIES = [
  { id: "health", label: "Health", color: "#22c55e" },
  { id: "mind", label: "Mind", color: "#a855f7" },
  { id: "work", label: "Work", color: "#3b82f6" },
  { id: "fitness", label: "Fitness", color: "#ef4444" },
  { id: "other", label: "Other", color: "#eab308" },
] as const;

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Human label for a habit's weekly target (1-7). 7 = every day. */
export function getWeeklyTargetLabel(weeklyTarget: number): string {
  const days = Math.min(7, Math.max(1, Math.round(weeklyTarget) || 7));
  return days === 7 ? "Every day" : `${days} days / week`;
}
