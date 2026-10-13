"use client";

import { create } from "zustand";
import { Habit } from "../lib/types";
import { toKey } from "../lib/date";
import * as actions from "@/app/actions/habit.actions";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function completionKey(habitId: string, date: Date): string {
  return `${habitId}__${toKey(date)}`;
}

interface HabitState {
  habits: Habit[];
  completions: Record<string, boolean>;
  initialized: boolean;
  initialize: (habits: Habit[], completions: actions.CompletionRow[]) => void;
  addHabit: (data: { name: string; category: string; goal: string }) => Promise<void>;
  updateHabit: (
    id: string,
    data: { name: string; category: string; goal: string }
  ) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (ids: string[]) => Promise<void>;
  toggleCompletion: (habitId: string, date: Date) => Promise<void>;
  setCompletion: (habitId: string, date: Date, completed: boolean) => Promise<void>;
  saveNotes: (habitId: string, notes: string | null) => Promise<void>;
  isCompleted: (habitId: string, date: Date) => boolean;
}

export const useHabitStore = create<HabitState>()((set, get) => ({
  habits: [],
  completions: {},
  initialized: false,

  initialize: (habits, completions) => {
    const completionsMap: Record<string, boolean> = {};
    for (const c of completions) {
      const key = `${c.habit_id}__${c.date}`;
      completionsMap[key] = c.completed;
    }
    set({ habits, completions: completionsMap, initialized: true });
  },

  addHabit: async (data) => {
    const tempId = genId();
    const newHabit: Habit = {
      id: tempId,
      name: data.name,
      goal: data.goal,
      notes: null,
      category: data.category,
      order: get().habits.length,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ habits: [...state.habits, newHabit] }));
    const result = await actions.addHabit(data);
    if ("error" in result) {
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== tempId),
      }));
      throw new Error(result.error);
    }
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === tempId ? result.habit : h
      ),
    }));
  },

  updateHabit: async (id, data) => {
    const prev = get().habits;
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...data } : h)),
    }));
    const result = await actions.updateHabit(id, data);
    if ("error" in result && result.error) {
      set({ habits: prev });
      throw new Error(result.error as string);
    }
  },

  deleteHabit: async (id) => {
    const prev = get().habits;
    const prevCompletions = get().completions;
    set((state) => {
      const completions = { ...state.completions };
      for (const key of Object.keys(completions)) {
        if (key.startsWith(`${id}__`)) {
          delete completions[key];
        }
      }
      return {
        habits: state.habits
          .filter((h) => h.id !== id)
          .map((h, i) => ({ ...h, order: i })),
        completions,
      };
    });
    const result = await actions.deleteHabit(id);
    if ("error" in result && result.error) {
      set({ habits: prev, completions: prevCompletions });
      throw new Error(result.error as string);
    }
  },

  reorderHabits: async (ids) => {
    const prev = get().habits;
    set((state) => ({
      habits: state.habits
        .map((h) => ({ ...h, order: ids.indexOf(h.id) }))
        .sort((a, b) => a.order - b.order),
    }));
    const result = await actions.reorderHabits(ids);
    if ("error" in result && result.error) {
      set({ habits: prev });
      throw new Error(result.error as string);
    }
  },

  toggleCompletion: async (habitId, date) => {
    const key = completionKey(habitId, date);
    const prev = get().completions[key];
    set((state) => {
      const completions = { ...state.completions };
      completions[key] = !completions[key];
      return { completions };
    });
    const dateStr = toKey(date);
    const result = await actions.toggleCompletion(habitId, dateStr);
    if ("error" in result && result.error) {
      set((state) => {
        const completions = { ...state.completions };
        completions[key] = prev;
        return { completions };
      });
      throw new Error(result.error as string);
    }
  },

  setCompletion: async (habitId, date, completed) => {
    const key = completionKey(habitId, date);
    const prev = get().completions[key];
    set((state) => {
      const completions = { ...state.completions };
      completions[key] = completed;
      return { completions };
    });
    const dateStr = toKey(date);
    const result = await actions.setCompletion(habitId, dateStr, completed);
    if ("error" in result && result.error) {
      set((state) => {
        const completions = { ...state.completions };
        completions[key] = prev;
        return { completions };
      });
      throw new Error(result.error as string);
    }
  },

  isCompleted: (habitId, date) => {
    return !!get().completions[completionKey(habitId, date)];
  },

  saveNotes: async (habitId, notes) => {
    const prev = get().habits.find((h) => h.id === habitId);
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === habitId ? { ...h, notes } : h
      ),
    }));
    const result = await actions.saveNotes(habitId, notes);
    if ("error" in result && result.error) {
      if (prev) {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === habitId ? prev : h
          ),
        }));
      }
      throw new Error(result.error as string);
    }
  },
}));
