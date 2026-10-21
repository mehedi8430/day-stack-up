"use client";

import { addDays, parseISO, startOfWeek } from "date-fns";
import { create } from "zustand";
import * as actions from "@/app/actions/planner.actions";
import { toKey } from "@/lib/date";
import type {
  PlannerPriority,
  PlannerStatus,
  PlannerTask,
} from "@/lib/planner-types";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nextPosition(tasks: PlannerTask[], date: string): number {
  return tasks.filter((task) => task.date === date).length;
}

function weekStartOf(date: string): string {
  return toKey(
    startOfWeek(parseISO(`${date}T12:00:00`), { weekStartsOn: 6 })
  );
}

let weekRequestId = 0;

interface NewPlannerTaskInput {
  title: string;
  date: string;
  startTime?: string;
  durationMinutes?: number;
  priority: PlannerPriority;
  notes?: string;
}

interface PlannerTaskUpdates {
  title?: string;
  startTime?: string | null;
  durationMinutes?: number | null;
  priority?: PlannerPriority;
  status?: PlannerStatus;
  notes?: string | null;
}

interface PlannerState {
  tasks: PlannerTask[];
  loadedWeekStart: string | null;
  isLoading: boolean;
  initialized: boolean;
  selectedDate: string;
  today: string;
  editingTaskId: string | null;
  deletingTaskId: string | null;
  initialize: (
    tasks: PlannerTask[],
    weekStart: string,
    selectedDate: string,
    today: string
  ) => void;
  reset: () => void;
  loadWeek: (weekStart: string) => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  changeDay: (offset: number) => Promise<void>;
  changeWeek: (offset: number) => Promise<void>;
  goToToday: () => Promise<void>;
  openEditTask: (id: string) => void;
  closeEditTask: () => void;
  requestDeleteTask: (id: string) => void;
  closeDeleteTask: () => void;
  createTask: (data: NewPlannerTaskInput) => Promise<void>;
  updateTask: (id: string, updates: PlannerTaskUpdates) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTaskToDate: (id: string, date: string) => Promise<void>;
  moveTaskToNextDay: (id: string) => Promise<void>;
  reorderTasks: (ids: string[]) => Promise<void>;
  setTaskStatus: (id: string, status: PlannerStatus) => Promise<void>;
}

export const usePlannerStore = create<PlannerState>()((set, get) => ({
  tasks: [],
  loadedWeekStart: null,
  isLoading: false,
  initialized: false,
  selectedDate: "",
  today: "",
  editingTaskId: null,
  deletingTaskId: null,

  initialize: (tasks, weekStart, selectedDate, today) => {
    weekRequestId += 1;
    set({
      tasks,
      loadedWeekStart: weekStart,
      isLoading: false,
      initialized: true,
      selectedDate,
      today,
      editingTaskId: null,
      deletingTaskId: null,
    });
  },

  reset: () => {
    weekRequestId += 1;
    set({
      tasks: [],
      loadedWeekStart: null,
      isLoading: false,
      initialized: false,
      selectedDate: "",
      today: "",
      editingTaskId: null,
      deletingTaskId: null,
    });
  },

  loadWeek: async (weekStart) => {
    const requestId = ++weekRequestId;
    set({ isLoading: true });
    const weekEnd = toKey(addDays(parseISO(`${weekStart}T12:00:00`), 6));
    try {
      const { tasks } = await actions.getPlannerTasksBetween(weekStart, weekEnd);
      if (requestId !== weekRequestId) return;
      set({ tasks, loadedWeekStart: weekStart });
    } catch (error) {
      if (requestId === weekRequestId) {
        set({ tasks: [], loadedWeekStart: weekStart });
      }
      throw error;
    } finally {
      if (requestId === weekRequestId) {
        set({ isLoading: false });
      }
    }
  },

  selectDate: async (date) => {
    set({ selectedDate: date });
    const targetWeekStart = weekStartOf(date);
    if (targetWeekStart !== get().loadedWeekStart) {
      await get().loadWeek(targetWeekStart);
    }
  },

  changeDay: async (offset) => {
    const nextDate = toKey(
      addDays(parseISO(`${get().selectedDate}T12:00:00`), offset)
    );
    await get().selectDate(nextDate);
  },

  changeWeek: async (offset) => {
    const nextDate = toKey(
      addDays(parseISO(`${get().selectedDate}T12:00:00`), offset * 7)
    );
    await get().selectDate(nextDate);
  },

  goToToday: async () => {
    await get().selectDate(get().today);
  },

  openEditTask: (id) => set({ editingTaskId: id }),
  closeEditTask: () => set({ editingTaskId: null }),
  requestDeleteTask: (id) => set({ deletingTaskId: id }),
  closeDeleteTask: () => set({ deletingTaskId: null }),

  createTask: async (data) => {
    const tempId = genId();
    const now = new Date().toISOString();
    const newTask: PlannerTask = {
      id: tempId,
      userId: "",
      title: data.title.trim(),
      date: data.date,
      startTime: data.startTime || null,
      durationMinutes: data.durationMinutes || null,
      priority: data.priority,
      status: "planned",
      notes: data.notes?.trim() || null,
      position: nextPosition(get().tasks, data.date),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ tasks: [...state.tasks, newTask] }));

    try {
      const result = await actions.createPlannerTask(data);
      if ("error" in result) throw new Error(result.error);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === tempId ? result.task : task
        ),
      }));
    } catch (error) {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== tempId),
      }));
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    const previous = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));

    try {
      const result = await actions.updatePlannerTask(id, updates);
      if ("error" in result) throw new Error(result.error);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? result.task : task
        ),
      }));
    } catch (error) {
      set({ tasks: previous });
      throw error;
    }
  },

  deleteTask: async (id) => {
    const previous = get().tasks;
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      editingTaskId: state.editingTaskId === id ? null : state.editingTaskId,
      deletingTaskId: state.deletingTaskId === id ? null : state.deletingTaskId,
    }));

    try {
      const result = await actions.deletePlannerTask(id);
      if (result.error) throw new Error(result.error);
    } catch (error) {
      set({ tasks: previous });
      throw error;
    }
  },

  moveTaskToDate: async (id, date) => {
    const previous = get().tasks;
    const position = get().tasks.filter(
      (task) => task.date === date && task.id !== id
    ).length;
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, date, status: "planned", position }
          : task
      ),
    }));

    try {
      const result = await actions.movePlannerTaskToDate(id, date);
      if ("error" in result) throw new Error(result.error);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? result.task : task
        ),
      }));
    } catch (error) {
      set({ tasks: previous });
      throw error;
    }
  },

  moveTaskToNextDay: async (id) => {
    const task = get().tasks.find((item) => item.id === id);
    if (!task) return;
    const nextDate = toKey(
      addDays(parseISO(`${task.date}T12:00:00`), 1)
    );
    await get().moveTaskToDate(id, nextDate);
  },

  reorderTasks: async (ids) => {
    const previous = get().tasks;
    const positions = new Map(ids.map((id, index) => [id, index]));
    set((state) => ({
      tasks: state.tasks.map((task) => {
        const position = positions.get(task.id);
        return position === undefined ? task : { ...task, position };
      }),
    }));

    try {
      const result = await actions.reorderPlannerTasks(ids);
      if ("error" in result) throw new Error(result.error);
    } catch (error) {
      set({ tasks: previous });
      throw error;
    }
  },

  setTaskStatus: async (id, status) => {
    await get().updateTask(id, { status });
  },
}));
