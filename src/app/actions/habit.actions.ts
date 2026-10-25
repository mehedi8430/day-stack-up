"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Habit } from "@/lib/types";

export interface CompletionRow {
  habit_id: string;
  date: string;
  completed: boolean;
}

export async function getInitialData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, habits: [], completions: [], schedules: [] };
  }

  const [habits, completions, schedules] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.completion.findMany({
      where: { userId: user.id },
    }),
    prisma.habitSchedule.findMany({
      where: { userId: user.id },
      orderBy: [{ habitId: "asc" }, { startsOn: "asc" }],
    }),
  ]);

  return {
    user,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      goal: h.goal,
      notes: h.notes ?? null,
      emoji: h.emoji,
      category: h.category,
      order: h.sortOrder,
      createdAt: h.createdAt.toISOString(),
      weeklyTarget: h.weeklyTarget,
    })),
    completions: completions.map((c) => ({
      habit_id: c.habitId,
      date: c.date.toISOString().split("T")[0],
      completed: c.completed,
    })),
    schedules: schedules.map((s) => ({
      habit_id: s.habitId,
      starts_on: s.startsOn.toISOString().split("T")[0],
      weekly_target: s.weeklyTarget,
    })),
  };
}

/**
 * Strict server-side validation for mutable weekly targets. Unlike the UI
 * (which only offers valid options), API-level callers can send anything.
 */
function parseWeeklyTarget(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 7) return null;
  return n;
}

/** Current date (UTC calendar day) used to start a new target period. */
function todayUtcDateKey(): Date {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
}

/** Anchors a timestamptz to its UTC calendar day (Prisma `@db.Date` input). */
function toUtcDateKey(value: Date): Date {
  return new Date(value.toISOString().slice(0, 10) + "T00:00:00.000Z");
}

export async function addHabit(data: {
  name: string;
  category: string;
  goal: string;
  weeklyTarget: number;
}): Promise<{ success: true; habit: Habit } | { error: string }> {
  const user = await requireUser();

  const weeklyTarget = parseWeeklyTarget(data.weeklyTarget);
  if (weeklyTarget === null) {
    return { error: "Weekly target must be between 1 and 7 days." };
  }

  const lastHabit = await prisma.habit.findFirst({
    where: { userId: user.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const nextOrder = lastHabit ? lastHabit.sortOrder + 1 : 0;

  // The habit and its first (effective-dated) schedule row are written
  // atomically so a habit can never exist without schedule history.
  const created = await prisma.$transaction(async (tx) => {
    const habit = await tx.habit.create({
      data: {
        userId: user.id,
        name: data.name,
        category: data.category,
        goal: data.goal,
        sortOrder: nextOrder,
        weeklyTarget,
      },
    });

    await tx.habitSchedule.create({
      data: {
        userId: user.id,
        habitId: habit.id,
        startsOn: toUtcDateKey(habit.createdAt),
        weeklyTarget,
      },
    });

    return habit;
  });

  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/analytics");
  return {
    success: true,
    habit: {
      id: created.id,
      name: created.name,
      goal: created.goal,
      notes: created.notes ?? null,
      emoji: created.emoji,
      category: created.category,
      order: created.sortOrder,
      createdAt: created.createdAt.toISOString(),
      weeklyTarget: created.weeklyTarget,
    },
  };
}

export async function updateHabit(
  id: string,
  data: { name: string; category: string; goal: string; weeklyTarget: number }
): Promise<{ success: true } | { error: string }> {
  const user = await requireUser();

  const weeklyTarget = parseWeeklyTarget(data.weeklyTarget);
  if (weeklyTarget === null) {
    return { error: "Weekly target must be between 1 and 7 days." };
  }

  const existing = await prisma.habit.findFirst({
    where: { id, userId: user.id },
    select: { weeklyTarget: true },
  });

  if (!existing) {
    return { error: "Habit not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.habit.update({
      where: { id, userId: user.id },
      data: {
        name: data.name,
        category: data.category,
        goal: data.goal,
        weeklyTarget,
      },
    });

    // Only target changes create history. The new target starts today; all
    // dates before it keep the previous row, preserving past progress. A row
    // for today already exists after multiple edits on the same day, so it is
    // updated in place to keep the unique (habit_id, starts_on) invariant.
    if (existing.weeklyTarget !== weeklyTarget) {
      const startsOn = todayUtcDateKey();
      const todayRow = await tx.habitSchedule.findUnique({
        where: {
          habitId_startsOn: { habitId: id, startsOn },
        },
      });

      if (todayRow) {
        await tx.habitSchedule.update({
          where: { id: todayRow.id },
          data: { weeklyTarget },
        });
      } else {
        await tx.habitSchedule.create({
          data: { userId: user.id, habitId: id, startsOn, weeklyTarget },
        });
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteHabit(id: string) {
  const user = await requireUser();

  await prisma.habit.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/analytics");
  return { success: true };
}

export async function reorderHabits(ids: string[]) {
  const user = await requireUser();

  const updates = ids.map((id, index) =>
    prisma.habit.update({
      where: { id, userId: user.id },
      data: { sortOrder: index },
    })
  );

  await Promise.all(updates);

  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/analytics");
  return { success: true };
}

export async function toggleCompletion(habitId: string, date: string) {
  const user = await requireUser();

  const dateObj = new Date(date);

  const existing = await prisma.completion.findUnique({
    where: {
      habitId_date: {
        habitId,
        date: dateObj,
      },
    },
  });

  if (existing && existing.completed) {
    await prisma.completion.delete({
      where: { id: existing.id },
    });
  } else if (existing) {
    await prisma.completion.update({
      where: { id: existing.id },
      data: { completed: true, updatedAt: new Date() },
    });
  } else {
    await prisma.completion.create({
      data: {
        userId: user.id,
        habitId,
        date: dateObj,
        completed: true,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/analytics");
  return { success: true };
}

export async function setCompletion(
  habitId: string,
  date: string,
  completed: boolean
) {
  const user = await requireUser();

  const dateObj = new Date(date);

  const existing = await prisma.completion.findUnique({
    where: {
      habitId_date: {
        habitId,
        date: dateObj,
      },
    },
  });

  if (!completed) {
    await prisma.completion.deleteMany({
      where: {
        userId: user.id,
        habitId,
        date: dateObj,
      },
    });
  } else if (existing) {
    await prisma.completion.update({
      where: { id: existing.id },
      data: { completed: true, updatedAt: new Date() },
    });
  } else {
    await prisma.completion.create({
      data: {
        userId: user.id,
        habitId,
        date: dateObj,
        completed: true,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/analytics");
  return { success: true };
}

export async function saveNotes(habitId: string, notes: string | null) {
  const user = await requireUser();

  await prisma.habit.update({
    where: { id: habitId, userId: user.id },
    data: { notes },
  });

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}
