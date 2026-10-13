"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type {
  PlannerPriority,
  PlannerStatus,
  PlannerTask,
} from "@/lib/planner-types";

function mapTask(task: unknown): PlannerTask {
  const t = task as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: t.id,
    userId: t.userId,
    title: t.title,
    date: t.date.toISOString().split("T")[0],
    startTime: t.startTime ?? null,
    durationMinutes: t.durationMinutes ?? null,
    priority: t.priority as PlannerPriority,
    status: t.status as PlannerStatus,
    notes: t.notes ?? null,
    position: t.position,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { user };
}

export async function getPlannerTasksBetween(
  from: string,
  to: string
): Promise<{ tasks: PlannerTask[] }> {
  const { user } = await getUser();
  const tasks = await prisma.dailyPlannerTask.findMany({
    where: {
      userId: user.id,
      date: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: [{ date: "asc" }, { position: "asc" }],
  });
  return { tasks: tasks.map((task) => mapTask(task)) };
}

export async function createPlannerTask(data: {
  title: string;
  date: string;
  startTime?: string;
  durationMinutes?: number;
  priority: PlannerPriority;
  notes?: string;
}): Promise<{ task: PlannerTask } | { error: string }> {
  const { user } = await getUser();
  const count = await prisma.dailyPlannerTask.count({
    where: {
      userId: user.id,
      date: new Date(data.date),
    },
  });

  const task = await prisma.dailyPlannerTask.create({
    data: {
      userId: user.id,
      title: data.title.trim(),
      date: new Date(data.date),
      startTime: data.startTime ? new Date(`1970-01-01T${data.startTime}`) : null,
      durationMinutes: data.durationMinutes || null,
      priority: data.priority,
      notes: data.notes?.trim() || null,
      position: count,
    },
  });

  revalidatePath("/planner");
  return { task: mapTask(task) };
}

export async function updatePlannerTask(
  id: string,
  updates: {
    title?: string;
    startTime?: string | null;
    durationMinutes?: number | null;
    priority?: PlannerPriority;
    status?: PlannerStatus;
    notes?: string | null;
  }
): Promise<{ task: PlannerTask } | { error: string }> {
  const { user } = await getUser();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.title !== undefined) values.title = updates.title.trim();
  if (updates.startTime !== undefined) {
    values.startTime = updates.startTime ? new Date(`1970-01-01T${updates.startTime}`) : null;
  }
  if (updates.durationMinutes !== undefined) values.durationMinutes = updates.durationMinutes || null;
  if (updates.priority !== undefined) values.priority = updates.priority;
  if (updates.status !== undefined) values.status = updates.status;
  if (updates.notes !== undefined) values.notes = updates.notes;

  const task = await prisma.dailyPlannerTask.update({
    where: { id, userId: user.id },
    data: values,
  });

  revalidatePath("/planner");
  return { task: mapTask(task) };
}

export async function deletePlannerTask(id: string): Promise<{ error?: string }> {
  const { user } = await getUser();
  await prisma.dailyPlannerTask.delete({
    where: { id, userId: user.id },
  });
  revalidatePath("/planner");
  return {};
}

export async function reorderPlannerTasks(ids: string[]): Promise<{ success: true } | { error: string }> {
  const { user } = await getUser();
  const updates = ids.map((id, index) =>
    prisma.dailyPlannerTask.update({
      where: { id, userId: user.id },
      data: { position: index, updatedAt: new Date() },
    }),
  );
  await Promise.all(updates);
  revalidatePath("/planner");
  return { success: true };
}

export async function movePlannerTaskToDate(
  id: string,
  date: string
): Promise<{ task: PlannerTask } | { error: string }> {
  const { user } = await getUser();
  const count = await prisma.dailyPlannerTask.count({
    where: {
      userId: user.id,
      date: new Date(date),
    },
  });

  const task = await prisma.dailyPlannerTask.update({
    where: { id, userId: user.id },
    data: {
      date: new Date(date),
      status: "planned",
      position: count,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/planner");
  return { task: mapTask(task) };
}
