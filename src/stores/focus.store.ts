"use client";

import { create } from "zustand";
import * as actions from "@/app/actions/focus.actions";
import type { FocusSession } from "@/lib/focus-types";
import { usePlannerStore } from "@/stores/planner.store";

interface FocusState {
  activeSession: FocusSession | null;
  pendingSwitchTaskId: string | null;
  finishingSessionId: string | null;
  isMutating: boolean;
  initialized: boolean;
  initialize: (session: FocusSession | null) => void;
  reset: () => void;
  requestStart: (taskId: string) => Promise<void>;
  confirmSwitch: () => Promise<void>;
  cancelSwitch: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  requestFinish: () => void;
  cancelFinish: () => void;
  confirmFinish: (markTaskDone: boolean) => Promise<void>;
  heartbeat: () => Promise<void>;
}

let focusRequestGeneration = 0;

const emptyState = {
  activeSession: null,
  pendingSwitchTaskId: null,
  finishingSessionId: null,
  isMutating: false,
  initialized: false,
} satisfies Pick<
  FocusState,
  | "activeSession"
  | "pendingSwitchTaskId"
  | "finishingSessionId"
  | "isMutating"
  | "initialized"
>;

export const useFocusStore = create<FocusState>()((set, get) => {
  const startTask = async (taskId: string): Promise<void> => {
    if (get().isMutating) return;
    const generation = focusRequestGeneration;
    set({ isMutating: true });

    try {
      const result = await actions.startFocusSession(taskId);
      if (generation !== focusRequestGeneration) return;
      if ("error" in result) throw new Error(result.error);

      usePlannerStore.getState().applyTaskUpdates(result.taskUpdates);
      set({
        activeSession: result.session,
        pendingSwitchTaskId: null,
      });
    } finally {
      if (generation === focusRequestGeneration) {
        set({ isMutating: false });
      }
    }
  };

  return {
    ...emptyState,

    initialize: (session) => {
      focusRequestGeneration += 1;
      set({
        ...emptyState,
        activeSession: session,
        initialized: true,
      });
    },

    reset: () => {
      focusRequestGeneration += 1;
      set({ ...emptyState });
    },

    requestStart: async (taskId) => {
      const active = get().activeSession;
      if (
        active &&
        active.status === "running" &&
        active.taskId !== taskId
      ) {
        set({ pendingSwitchTaskId: taskId });
        return;
      }
      await startTask(taskId);
    },

    confirmSwitch: async () => {
      const taskId = get().pendingSwitchTaskId;
      if (!taskId) return;
      set({ pendingSwitchTaskId: null });
      await startTask(taskId);
    },

    cancelSwitch: () => set({ pendingSwitchTaskId: null }),

    pause: async () => {
      const active = get().activeSession;
      if (!active || active.status !== "running" || get().isMutating) return;

      const generation = focusRequestGeneration;
      set({ isMutating: true });
      try {
        const result = await actions.pauseFocusSession(active.id);
        if (generation !== focusRequestGeneration) return;
        if ("error" in result) throw new Error(result.error);

        usePlannerStore.getState().applyTaskUpdates(result.taskUpdates);
        set({ activeSession: result.session });
      } finally {
        if (generation === focusRequestGeneration) {
          set({ isMutating: false });
        }
      }
    },

    resume: async () => {
      const active = get().activeSession;
      if (!active || active.status === "completed" || get().isMutating) {
        return;
      }

      const generation = focusRequestGeneration;
      set({ isMutating: true });
      try {
        const result = await actions.resumeFocusSession(active.id);
        if (generation !== focusRequestGeneration) return;
        if ("error" in result) throw new Error(result.error);

        usePlannerStore.getState().applyTaskUpdates(result.taskUpdates);
        set({ activeSession: result.session });
      } finally {
        if (generation === focusRequestGeneration) {
          set({ isMutating: false });
        }
      }
    },

    requestFinish: () => {
      const active = get().activeSession;
      if (!active || active.status === "completed") return;
      set({ finishingSessionId: active.id });
    },

    cancelFinish: () => set({ finishingSessionId: null }),

    confirmFinish: async (markTaskDone) => {
      const sessionId =
        get().finishingSessionId ?? get().activeSession?.id ?? null;
      if (!sessionId || get().isMutating) return;

      const generation = focusRequestGeneration;
      set({ isMutating: true });
      try {
        const result = await actions.finishFocusSession(
          sessionId,
          markTaskDone,
        );
        if (generation !== focusRequestGeneration) return;
        if ("error" in result) throw new Error(result.error);

        usePlannerStore.getState().applyTaskUpdates(result.taskUpdates);
        set({
          activeSession: null,
          finishingSessionId: null,
        });
      } finally {
        if (generation === focusRequestGeneration) {
          set({ isMutating: false });
        }
      }
    },

    heartbeat: async () => {
      const active = get().activeSession;
      if (!active || active.status !== "running") return;

      const generation = focusRequestGeneration;
      try {
        const result = await actions.heartbeatFocusSession(active.id);
        if (generation !== focusRequestGeneration) return;
        if ("error" in result) return;

        usePlannerStore.getState().applyTaskUpdates(result.taskUpdates);
        if (get().activeSession?.id === result.session.id) {
          set({ activeSession: result.session });
        }
      } catch {
        // A missed heartbeat is not fatal: the next one catches up.
      }
    },
  };
});
