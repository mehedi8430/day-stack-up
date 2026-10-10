"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  PlannerPriority,
  PlannerStatus,
  PlannerTask,
} from "@/lib/planner-types";

function mapTask(task: Record<string, unknown>): PlannerTask {
  return {
    id: task.id as string,
    userId: task.user_id as string,
    title: task.title as string,
    date: task.date as string,
    startTime: (task.start_time as string) ?? null,
    durationMinutes: (task.duration_minutes as number) ?? null,
    priority: task.priority as PlannerPriority,
    status: task.status as PlannerStatus,
    notes: (task.notes as string) ?? null,
    position: task.position as number,
    createdAt: task.created_at as string,
    updatedAt: task.updated_at as string,
  };
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getPlannerTasksBetween(
  from: string,
  to: string
): Promise<{ tasks: PlannerTask[] }> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("daily_planner_tasks")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) throw new Error(`Failed to fetch planner tasks: ${error.message}`);
  return { tasks: (data ?? []).map((task) => mapTask(task as Record<string, unknown>)) };
}

export async function createPlannerTask(data: {
  title: string;
  date: string;
  startTime?: string;
  durationMinutes?: number;
  priority: PlannerPriority;
  notes?: string;
}): Promise<{ task: PlannerTask } | { error: string }> {
  const { supabase, user } = await getUser();
  const { count } = await supabase
    .from("daily_planner_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date", data.date);

  const { data: task, error } = await supabase
    .from("daily_planner_tasks")
    .insert({
      user_id: user.id,
      title: data.title.trim(),
      date: data.date,
      start_time: data.startTime || null,
      duration_minutes: data.durationMinutes || null,
      priority: data.priority,
      notes: data.notes?.trim() || null,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { task: mapTask(task as Record<string, unknown>) };
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
  const { supabase, user } = await getUser();
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) values.title = updates.title.trim();
  if (updates.startTime !== undefined) values.start_time = updates.startTime || null;
  if (updates.durationMinutes !== undefined) values.duration_minutes = updates.durationMinutes || null;
  if (updates.priority !== undefined) values.priority = updates.priority;
  if (updates.status !== undefined) values.status = updates.status;
  if (updates.notes !== undefined) values.notes = updates.notes;

  const { data: task, error } = await supabase
    .from("daily_planner_tasks")
    .update(values)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { task: mapTask(task as Record<string, unknown>) };
}

export async function deletePlannerTask(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("daily_planner_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  return {};
}

export async function reorderPlannerTasks(ids: string[]): Promise<{ success: true } | { error: string }> {
  const { supabase, user } = await getUser();
  const updates = ids.map((id, index) =>
    supabase
      .from("daily_planner_tasks")
      .update({ position: index, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id),
  );
  const results = await Promise.all(updates);
  const err = results.find((r) => r.error);
  if (err) return { error: err.error!.message };
  revalidatePath("/planner");
  return { success: true };
}

export async function movePlannerTaskToDate(
  id: string,
  date: string
): Promise<{ task: PlannerTask } | { error: string }> {
  const { supabase, user } = await getUser();

  const { count } = await supabase
    .from("daily_planner_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date", date);

  const { data: task, error } = await supabase
    .from("daily_planner_tasks")
    .update({
      date,
      status: "planned",
      position: count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { task: mapTask(task as Record<string, unknown>) };
}