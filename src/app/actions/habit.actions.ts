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
    return { user: null, habits: [], completions: [] };
  }

  const [habits, completions] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.completion.findMany({
      where: { userId: user.id },
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
    })),
    completions: completions.map((c) => ({
      habit_id: c.habitId,
      date: c.date.toISOString().split("T")[0],
      completed: c.completed,
    })),
  };
}

export async function addHabit(data: {
  name: string;
  category: string;
  goal: string;
}): Promise<{ success: true; habit: Habit } | { error: string }> {
  const user = await requireUser();

  const lastHabit = await prisma.habit.findFirst({
    where: { userId: user.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const nextOrder = lastHabit ? lastHabit.sortOrder + 1 : 0;

  const created = await prisma.habit.create({
    data: {
      userId: user.id,
      name: data.name,
      category: data.category,
      goal: data.goal,
      sortOrder: nextOrder,
    },
  });

  revalidatePath("/");
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
    },
  };
}

export async function updateHabit(
  id: string,
  data: { name: string; category: string; goal: string }
) {
  const user = await requireUser();

  await prisma.habit.update({
    where: { id, userId: user.id },
    data: {
      name: data.name,
      category: data.category,
      goal: data.goal,
    },
  });

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteHabit(id: string) {
  const user = await requireUser();

  await prisma.habit.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/");
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
