"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { HabitMilestone, MilestoneStatus } from "@/lib/types";

function mapMilestone(milestone: unknown): HabitMilestone {
  const m = milestone as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: m.id,
    habitId: m.habitId,
    title: m.title,
    status: m.status as MilestoneStatus,
    startDate: m.startDate ? m.startDate.toISOString().split("T")[0] : null,
    targetDate: m.targetDate ? m.targetDate.toISOString().split("T")[0] : null,
    details: m.details ?? "",
    resources: m.resources ?? "",
    order: m.sortOrder ?? 0,
  };
}

export async function getHabitMilestones(habitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [habit, milestones] = await Promise.all([
    prisma.habit.findFirst({
      where: { id: habitId, userId: user.id },
    }),
    prisma.habitTopic.findMany({
      where: { habitId, userId: user.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!habit) return { habit: null, milestones: [] };
  return {
    habit: {
      id: habit.id,
      name: habit.name,
      goal: habit.goal ?? "",
    },
    milestones: milestones.map((milestone) => mapMilestone(milestone)),
  };
}

export type HabitMilestoneInput = Omit<HabitMilestone, "id" | "habitId" | "order">;

export async function createHabitMilestone(habitId: string, data: HabitMilestoneInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const last = await prisma.habitTopic.findFirst({
    where: { habitId, userId: user.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const milestone = await prisma.habitTopic.create({
    data: {
      userId: user.id,
      habitId,
      title: data.title,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      details: data.details,
      resources: data.resources,
      sortOrder: last?.sortOrder != null ? last.sortOrder + 1 : 0,
    },
  });

  revalidatePath(`/habits/${habitId}/milestones`);
  return { success: true, milestone: mapMilestone(milestone) };
}

export async function updateHabitMilestone(milestoneId: string, habitId: string, data: HabitMilestoneInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const milestone = await prisma.habitTopic.update({
    where: { id: milestoneId, userId: user.id },
    data: {
      title: data.title,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      details: data.details,
      resources: data.resources,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/habits/${habitId}/milestones`);
  return { success: true, milestone: mapMilestone(milestone) };
}

export async function deleteHabitMilestone(milestoneId: string, habitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await prisma.habitTopic.delete({
    where: { id: milestoneId, userId: user.id },
  });

  revalidatePath(`/habits/${habitId}/milestones`);
  return { success: true };
}

export async function reorderHabitMilestones(habitId: string, ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await Promise.all(
    ids.map((id, index) =>
      prisma.habitTopic.update({
        where: { id, userId: user.id },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath(`/habits/${habitId}/milestones`);
  return { success: true };
}
