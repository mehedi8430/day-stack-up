export const SETTING_KEYS = {
  workGoals: "work-goals",
} as const;

export interface WorkGoalSettings {
  dailyTargetMinutes: number;
  workdaysPerWeek: number;
}

export const DEFAULT_WORK_GOALS: WorkGoalSettings = {
  dailyTargetMinutes: 8 * 60,
  workdaysPerWeek: 5,
};

export function getWeeklyWorkTargetMinutes(
  settings: WorkGoalSettings,
): number {
  return settings.dailyTargetMinutes * settings.workdaysPerWeek;
}

export function isQualifyingWorkday(
  minutesWorked: number,
  settings: WorkGoalSettings,
): boolean {
  return minutesWorked >= settings.dailyTargetMinutes;
}

export function parseWorkGoalSettings(
  value: unknown,
): WorkGoalSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const settings = value as Record<string, unknown>;
  const dailyTargetMinutes = settings.dailyTargetMinutes;
  const workdaysPerWeek = settings.workdaysPerWeek;

  if (
    typeof dailyTargetMinutes !== "number" ||
    !Number.isInteger(dailyTargetMinutes) ||
    dailyTargetMinutes < 15 ||
    dailyTargetMinutes > 24 * 60 ||
    dailyTargetMinutes % 15 !== 0 ||
    typeof workdaysPerWeek !== "number" ||
    !Number.isInteger(workdaysPerWeek) ||
    workdaysPerWeek < 1 ||
    workdaysPerWeek > 7
  ) {
    return null;
  }

  return { dailyTargetMinutes, workdaysPerWeek };
}
