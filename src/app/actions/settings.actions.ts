"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  DEFAULT_WORK_GOALS,
  parseWorkGoalSettings,
  SETTING_KEYS,
  type WorkGoalSettings,
} from "@/lib/settings";

export async function getWorkGoalSettings(): Promise<WorkGoalSettings> {
  const user = await requireUser();
  const setting = await prisma.userSetting.findUnique({
    where: {
      userId_key: {
        userId: user.id,
        key: SETTING_KEYS.workGoals,
      },
    },
    select: { value: true },
  });

  if (!setting) return DEFAULT_WORK_GOALS;

  const parsed = parseWorkGoalSettings(setting.value);
  if (!parsed) {
    throw new Error("Saved work goal settings are invalid");
  }
  return parsed;
}

export async function saveWorkGoalSettings(
  input: unknown,
): Promise<{ success: true; settings: WorkGoalSettings } | { error: string }> {
  const settings = parseWorkGoalSettings(input);
  if (!settings) {
    return {
      error:
        "Set a daily target from 15 minutes to 24 hours in 15-minute increments, and choose 1–7 workdays per week.",
    };
  }

  const user = await requireUser();
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: user.id,
        key: SETTING_KEYS.workGoals,
      },
    },
    create: {
      userId: user.id,
      key: SETTING_KEYS.workGoals,
      value: {
        dailyTargetMinutes: settings.dailyTargetMinutes,
        workdaysPerWeek: settings.workdaysPerWeek,
      },
    },
    update: {
      value: {
        dailyTargetMinutes: settings.dailyTargetMinutes,
        workdaysPerWeek: settings.workdaysPerWeek,
      },
      updatedAt: new Date(),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/analytics");
  return { success: true, settings };
}
