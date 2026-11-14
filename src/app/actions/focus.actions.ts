"use server";

import { revalidatePath } from "next/cache";
import type { FocusSession as FocusSessionModel, Prisma } from "@prisma/client";
import {
  getSessionElapsedSeconds,
  lockFocusSession,
  mergeTaskUpdate,
  sessionInclude,
  syncTrackedTime,
  type FocusSessionRow,
} from "@/lib/focus-accounting";
import {
  getPomodoroBreakPhase,
  getPomodoroRemainingSeconds,
} from "@/lib/focus-timer";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  FocusMutationResult,
  FocusSession,
  FocusSessionStatus,
} from "@/lib/focus-types";
import type { PlannerStatus, PlannerTaskPatch } from "@/lib/planner-types";

function toDateKey(value: Date): string {
  return value.toISOString().split("T")[0];
}

function mapFocusSession(session: FocusSessionRow): FocusSession {
  return {
    id: session.id,
    userId: session.userId,
    taskId: session.taskId,
    taskTitle: session.task.title,
    taskDate: toDateKey(session.task.date),
    taskStatus: session.task.status as PlannerStatus,
    status: session.status as FocusSessionStatus,
    startedAt: session.startedAt.toISOString(),
    segmentStartedAt: session.segmentStartedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    accumulatedSeconds: session.accumulatedSeconds,
    reportedSeconds: session.reportedSeconds,
    pomodoroEnabled: session.pomodoroEnabled,
    pomodoroPhase: session.pomodoroPhase as FocusSession["pomodoroPhase"],
    pomodoroPhaseEndsAt: session.pomodoroPhaseEndsAt?.toISOString() ?? null,
    pomodoroRemainingSeconds: session.pomodoroRemainingSeconds,
    pomodoroFocusMinutes: session.pomodoroFocusMinutes,
    pomodoroShortBreakMinutes: session.pomodoroShortBreakMinutes,
    pomodoroLongBreakMinutes: session.pomodoroLongBreakMinutes,
    pomodoroCompletedCount: session.pomodoroCompletedCount,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

async function pauseSession(
  tx: Prisma.TransactionClient,
  session: FocusSessionModel,
  now: Date,
): Promise<{
  session: FocusSessionRow;
  taskUpdate?: PlannerTaskPatch;
}> {
  const elapsedSeconds = getSessionElapsedSeconds(session, now);
  const sync = await syncTrackedTime(tx, session, elapsedSeconds, now);
  const pomodoroRemainingSeconds = session.pomodoroEnabled
    ? getPomodoroRemainingSeconds(
        session.pomodoroPhaseEndsAt?.toISOString() ?? null,
        session.pomodoroRemainingSeconds,
        now.getTime(),
      )
    : session.pomodoroRemainingSeconds;

  const updated = await tx.focusSession.update({
    where: { id: session.id, userId: session.userId },
    data: {
      accumulatedSeconds: elapsedSeconds,
      segmentStartedAt: null,
      status: "paused",
      pomodoroPhaseEndsAt: null,
      pomodoroRemainingSeconds,
      reportedSeconds: sync.reportedSeconds,
      updatedAt: now,
    },
    include: sessionInclude,
  });

  return {
    session: updated,
    taskUpdate: sync.taskUpdate,
  };
}

async function completePomodoroFocus(
  tx: Prisma.TransactionClient,
  session: FocusSessionRow,
  now: Date,
): Promise<{
  session: FocusSessionRow;
  taskUpdate?: PlannerTaskPatch;
}> {
  const focusEndedAt = session.pomodoroPhaseEndsAt;
  if (
    !session.pomodoroEnabled ||
    session.pomodoroPhase !== "focus" ||
    !focusEndedAt ||
    focusEndedAt.getTime() > now.getTime()
  ) {
    return { session };
  }

  const elapsedSeconds = getSessionElapsedSeconds(session, focusEndedAt);
  const sync = await syncTrackedTime(tx, session, elapsedSeconds, now);
  const completedCount = session.pomodoroCompletedCount + 1;
  const phase = getPomodoroBreakPhase(completedCount);
  const breakMinutes =
    phase === "long_break"
      ? session.pomodoroLongBreakMinutes
      : session.pomodoroShortBreakMinutes;
  const breakEndsAt = new Date(
    focusEndedAt.getTime() + breakMinutes * 60_000,
  );

  const updated = await tx.focusSession.update({
    where: { id: session.id, userId: session.userId },
    data: {
      status: "paused",
      segmentStartedAt: null,
      accumulatedSeconds: elapsedSeconds,
      reportedSeconds: sync.reportedSeconds,
      pomodoroPhase: phase,
      pomodoroPhaseEndsAt: breakEndsAt,
      pomodoroRemainingSeconds: null,
      pomodoroCompletedCount: completedCount,
      updatedAt: now,
    },
    include: sessionInclude,
  });

  return { session: updated, taskUpdate: sync.taskUpdate };
}

async function pauseRunningSessions(
  tx: Prisma.TransactionClient,
  userId: string,
  exceptSessionId: string | null,
  now: Date,
): Promise<PlannerTaskPatch[]> {
  const running = await tx.focusSession.findMany({
    where: {
      userId,
      status: "running",
      endedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
  });

  const taskUpdates: PlannerTaskPatch[] = [];
  for (const candidate of running) {
    const session = await lockFocusSession(tx, candidate.id, userId);
    if (!session || session.status !== "running") continue;

    if (
      session.pomodoroEnabled &&
      session.pomodoroPhase === "focus" &&
      session.pomodoroPhaseEndsAt &&
      session.pomodoroPhaseEndsAt.getTime() <= now.getTime()
    ) {
      const completed = await completePomodoroFocus(tx, session, now);
      if (completed.taskUpdate) {
        mergeTaskUpdate(taskUpdates, completed.taskUpdate);
      }
    } else {
      const paused = await pauseSession(tx, session, now);
      if (paused.taskUpdate) {
        mergeTaskUpdate(taskUpdates, paused.taskUpdate);
      }
    }
  }
  return taskUpdates;
}

function revalidateFocusPaths(taskUpdates: PlannerTaskPatch[]): void {
  if (taskUpdates.length === 0) return;
  revalidatePath("/planner");
  revalidatePath("/analytics");
}

export async function getActiveFocusSession(): Promise<{
  session: FocusSession | null;
}> {
  const user = await requireUser();

  const running = await prisma.focusSession.findFirst({
    where: { userId: user.id, status: "running", endedAt: null },
    include: sessionInclude,
    orderBy: { updatedAt: "desc" },
  });
  if (running) {
    return { session: mapFocusSession(running) };
  }

  const paused = await prisma.focusSession.findFirst({
    where: { userId: user.id, status: "paused", endedAt: null },
    include: sessionInclude,
    orderBy: { updatedAt: "desc" },
  });

  return { session: paused ? mapFocusSession(paused) : null };
}

export async function startFocusSession(
  taskId: string,
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();

  const task = await prisma.dailyPlannerTask.findFirst({
    where: { id: taskId, userId: user.id },
    select: { id: true },
  });
  if (!task) {
    return { error: "Task not found" };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const taskUpdates: PlannerTaskPatch[] = [];
    const existingSummary = await tx.focusSession.findFirst({
      where: { userId: user.id, taskId, endedAt: null },
    });
    const existing = existingSummary
      ? await lockFocusSession(tx, existingSummary.id, user.id)
      : null;

    const pausedUpdates = await pauseRunningSessions(
      tx,
      user.id,
      existing?.id ?? null,
      now,
    );
    for (const update of pausedUpdates) {
      mergeTaskUpdate(taskUpdates, update);
    }

    let session: FocusSessionRow;
    if (existing) {
      if (existing.status === "running") {
        session = await tx.focusSession.findFirstOrThrow({
          where: { id: existing.id, userId: user.id },
          include: sessionInclude,
        });
      } else {
        const resumePomodoro =
          existing.pomodoroEnabled && existing.pomodoroPhase !== null;
        const remainingSeconds =
          existing.pomodoroPhase === "focus"
            ? existing.pomodoroRemainingSeconds ??
              existing.pomodoroFocusMinutes * 60
            : existing.pomodoroFocusMinutes * 60;
        session = await tx.focusSession.update({
          where: { id: existing.id, userId: user.id },
          data: {
            status: "running",
            segmentStartedAt: now,
            ...(resumePomodoro
              ? {
                  pomodoroPhase: "focus",
                  pomodoroPhaseEndsAt: new Date(
                    now.getTime() + remainingSeconds * 1000,
                  ),
                  pomodoroRemainingSeconds: null,
                }
              : {}),
            updatedAt: now,
          },
          include: sessionInclude,
        });
      }
    } else {
      session = await tx.focusSession.create({
        data: {
          userId: user.id,
          taskId,
          status: "running",
          startedAt: now,
          segmentStartedAt: now,
          accumulatedSeconds: 0,
          reportedSeconds: 0,
        },
        include: sessionInclude,
      });
    }

    return { session, taskUpdates };
  });

  revalidateFocusPaths(result.taskUpdates);
  return {
    session: mapFocusSession(result.session),
    taskUpdates: result.taskUpdates,
  };
}

export async function startPomodoroSession(
  sessionId: string,
  settings: {
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
  },
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  if (
    !settings ||
    typeof settings !== "object" ||
    !Number.isInteger(settings.focusMinutes) ||
    settings.focusMinutes < 1 ||
    settings.focusMinutes > 120 ||
    !Number.isInteger(settings.shortBreakMinutes) ||
    settings.shortBreakMinutes < 1 ||
    settings.shortBreakMinutes > 30 ||
    !Number.isInteger(settings.longBreakMinutes) ||
    settings.longBreakMinutes < 1 ||
    settings.longBreakMinutes > 60
  ) {
    return { error: "Invalid Pomodoro durations" };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const session = await lockFocusSession(tx, sessionId, user.id);
    if (!session || session.status === "completed" || session.endedAt) {
      return { error: "An active focus session is required" };
    }

    if (session.pomodoroEnabled) {
      return { session: mapFocusSession(session), taskUpdates: [] };
    }

    const taskUpdates = await pauseRunningSessions(tx, user.id, session.id, now);
    const focusEndsAt = new Date(
      now.getTime() + settings.focusMinutes * 60_000,
    );
    const updated = await tx.focusSession.update({
      where: { id: session.id, userId: user.id },
      data: {
        status: "running",
        segmentStartedAt:
          session.status === "running"
            ? (session.segmentStartedAt ?? now)
            : now,
        pomodoroEnabled: true,
        pomodoroPhase: "focus",
        pomodoroPhaseEndsAt: focusEndsAt,
        pomodoroRemainingSeconds: null,
        pomodoroFocusMinutes: settings.focusMinutes,
        pomodoroShortBreakMinutes: settings.shortBreakMinutes,
        pomodoroLongBreakMinutes: settings.longBreakMinutes,
        pomodoroCompletedCount: 0,
        updatedAt: now,
      },
      include: sessionInclude,
    });

    return { session: mapFocusSession(updated), taskUpdates };
  });

  if ("error" in result) return result;
  revalidateFocusPaths(result.taskUpdates);
  return result;
}

export async function advancePomodoroSession(
  sessionId: string,
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await lockFocusSession(tx, sessionId, user.id);
    if (!session) return { error: "Focus session not found" };

    const completed = await completePomodoroFocus(tx, session, now);
    return {
      session: mapFocusSession(completed.session),
      taskUpdates: completed.taskUpdate ? [completed.taskUpdate] : [],
    };
  });

  if ("error" in result) return result;
  revalidateFocusPaths(result.taskUpdates);
  return result;
}

export async function stopPomodoroSession(
  sessionId: string,
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let session = await lockFocusSession(tx, sessionId, user.id);
    if (!session) return { error: "Focus session not found" };
    if (session.status === "completed" || !session.pomodoroEnabled) {
      return { session: mapFocusSession(session), taskUpdates: [] };
    }

    const taskUpdates: PlannerTaskPatch[] = [];
    if (
      session.pomodoroPhase === "focus" &&
      session.pomodoroPhaseEndsAt &&
      session.pomodoroPhaseEndsAt.getTime() <= now.getTime()
    ) {
      const completed = await completePomodoroFocus(tx, session, now);
      session = completed.session;
      if (completed.taskUpdate) {
        mergeTaskUpdate(taskUpdates, completed.taskUpdate);
      }
    }

    const leavingBreak =
      session.pomodoroPhase === "short_break" ||
      session.pomodoroPhase === "long_break";
    if (leavingBreak) {
      const pausedUpdates = await pauseRunningSessions(
        tx,
        user.id,
        session.id,
        now,
      );
      for (const update of pausedUpdates) {
        mergeTaskUpdate(taskUpdates, update);
      }
    }

    const shouldRun = session.status === "running" || leavingBreak;
    const updated = await tx.focusSession.update({
      where: { id: session.id, userId: user.id },
      data: {
        status: shouldRun ? "running" : "paused",
        segmentStartedAt: shouldRun
          ? leavingBreak
            ? now
            : (session.segmentStartedAt ?? now)
          : null,
        pomodoroEnabled: false,
        pomodoroPhase: null,
        pomodoroPhaseEndsAt: null,
        pomodoroRemainingSeconds: null,
        updatedAt: now,
      },
      include: sessionInclude,
    });

    return {
      session: mapFocusSession(updated),
      taskUpdates,
    };
  });

  if ("error" in result) return result;
  revalidateFocusPaths(result.taskUpdates);
  return result;
}

export async function pauseFocusSession(
  sessionId: string,
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await lockFocusSession(tx, sessionId, user.id);
    if (!session) {
      return { error: "Focus session not found" };
    }

    if (
      session.pomodoroEnabled &&
      session.pomodoroPhase === "focus" &&
      session.pomodoroPhaseEndsAt &&
      session.pomodoroPhaseEndsAt.getTime() <= now.getTime()
    ) {
      const completed = await completePomodoroFocus(tx, session, now);
      return {
        session: mapFocusSession(completed.session),
        taskUpdates: completed.taskUpdate ? [completed.taskUpdate] : [],
      };
    }

    if (
      session.pomodoroEnabled &&
      session.status === "paused" &&
      (session.pomodoroPhase === "short_break" ||
        session.pomodoroPhase === "long_break") &&
      session.pomodoroPhaseEndsAt
    ) {
      const remainingSeconds = getPomodoroRemainingSeconds(
        session.pomodoroPhaseEndsAt.toISOString(),
        null,
        now.getTime(),
      );
      const paused = await tx.focusSession.update({
        where: { id: session.id, userId: user.id },
        data: {
          pomodoroPhaseEndsAt: null,
          pomodoroRemainingSeconds: remainingSeconds,
          updatedAt: now,
        },
        include: sessionInclude,
      });
      return { session: mapFocusSession(paused), taskUpdates: [] };
    }

    if (session.status !== "running") {
      return { session: mapFocusSession(session), taskUpdates: [] };
    }

    const paused = await pauseSession(tx, session, now);
    return {
      session: mapFocusSession(paused.session),
      taskUpdates: paused.taskUpdate ? [paused.taskUpdate] : [],
    };
  });

  if ("error" in result) return result;
  revalidateFocusPaths(result.taskUpdates);
  return result;
}

export async function resumeFocusSession(
  sessionId: string,
  skipBreak = false,
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await lockFocusSession(tx, sessionId, user.id);
    if (!session) {
      return { error: "Focus session not found" };
    }
    if (session.status === "completed") {
      return { session: mapFocusSession(session), taskUpdates: [] };
    }
    if (session.status === "running") {
      return { session: mapFocusSession(session), taskUpdates: [] };
    }

    if (session.pomodoroEnabled) {
      const isBreak =
        session.pomodoroPhase === "short_break" ||
        session.pomodoroPhase === "long_break";
      if (isBreak) {
        const remainingSeconds = getPomodoroRemainingSeconds(
          session.pomodoroPhaseEndsAt?.toISOString() ?? null,
          session.pomodoroRemainingSeconds,
          now.getTime(),
        );
        if (!skipBreak && remainingSeconds !== null && remainingSeconds > 0) {
          const resumedBreak = await tx.focusSession.update({
            where: { id: session.id, userId: user.id },
            data: {
              pomodoroPhaseEndsAt: new Date(
                now.getTime() + remainingSeconds * 1000,
              ),
              pomodoroRemainingSeconds: null,
              updatedAt: now,
            },
            include: sessionInclude,
          });
          return {
            session: mapFocusSession(resumedBreak),
            taskUpdates: [],
          };
        }

        const taskUpdates = await pauseRunningSessions(
          tx,
          user.id,
          session.id,
          now,
        );
        const focusEndsAt = new Date(
          now.getTime() + session.pomodoroFocusMinutes * 60_000,
        );
        const resumedFocus = await tx.focusSession.update({
          where: { id: session.id, userId: user.id },
          data: {
            status: "running",
            segmentStartedAt: now,
            pomodoroPhase: "focus",
            pomodoroPhaseEndsAt: focusEndsAt,
            pomodoroRemainingSeconds: null,
            updatedAt: now,
          },
          include: sessionInclude,
        });
        return {
          session: mapFocusSession(resumedFocus),
          taskUpdates,
        };
      }

      if (session.pomodoroPhase === "focus") {
        const remainingSeconds =
          session.pomodoroRemainingSeconds ??
          session.pomodoroFocusMinutes * 60;
        const taskUpdates = await pauseRunningSessions(
          tx,
          user.id,
          session.id,
          now,
        );
        const resumedFocus = await tx.focusSession.update({
          where: { id: session.id, userId: user.id },
          data: {
            status: "running",
            segmentStartedAt: now,
            pomodoroPhaseEndsAt: new Date(
              now.getTime() + remainingSeconds * 1000,
            ),
            pomodoroRemainingSeconds: null,
            updatedAt: now,
          },
          include: sessionInclude,
        });
        return {
          session: mapFocusSession(resumedFocus),
          taskUpdates,
        };
      }
    }

    const taskUpdates = await pauseRunningSessions(
      tx,
      user.id,
      session.id,
      now,
    );

    const running = await tx.focusSession.update({
      where: { id: session.id, userId: user.id },
      data: {
        status: "running",
        segmentStartedAt: now,
        updatedAt: now,
      },
      include: sessionInclude,
    });

    return { session: mapFocusSession(running), taskUpdates };
  });

  if ("error" in result) return result;
  revalidateFocusPaths(result.taskUpdates);
  return result;
}

export async function finishFocusSession(
  sessionId: string,
  markTaskDone = false,
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let session = await lockFocusSession(tx, sessionId, user.id);
    if (!session) {
      return { error: "Focus session not found" };
    }

    if (session.status === "completed") {
      if (!markTaskDone) {
        return { session: mapFocusSession(session), taskUpdates: [] };
      }

      await tx.dailyPlannerTask.update({
        where: { id: session.taskId, userId: user.id },
        data: { status: "done", updatedAt: now },
      });
      return {
        session: mapFocusSession(session),
        taskUpdates: [
          { id: session.taskId, status: "done" as const },
        ],
      };
    }

    const taskUpdates: PlannerTaskPatch[] = [];
    if (
      session.pomodoroEnabled &&
      session.pomodoroPhase === "focus" &&
      session.pomodoroPhaseEndsAt &&
      session.pomodoroPhaseEndsAt.getTime() <= now.getTime()
    ) {
      const completed = await completePomodoroFocus(tx, session, now);
      session = completed.session;
      if (completed.taskUpdate) {
        mergeTaskUpdate(taskUpdates, completed.taskUpdate);
      }
    }

    const elapsedSeconds = getSessionElapsedSeconds(session, now);
    const sync = await syncTrackedTime(tx, session, elapsedSeconds, now);
    if (sync.taskUpdate) {
      mergeTaskUpdate(taskUpdates, sync.taskUpdate);
    }

    const finished = await tx.focusSession.update({
      where: { id: session.id, userId: user.id },
      data: {
        accumulatedSeconds: elapsedSeconds,
        segmentStartedAt: null,
        endedAt: now,
        status: "completed",
        reportedSeconds: sync.reportedSeconds,
        pomodoroPhaseEndsAt: null,
        pomodoroRemainingSeconds: null,
        updatedAt: now,
      },
      include: sessionInclude,
    });

    if (markTaskDone) {
      await tx.dailyPlannerTask.update({
        where: { id: session.taskId, userId: user.id },
        data: { status: "done", updatedAt: now },
      });
      mergeTaskUpdate(taskUpdates, { id: session.taskId, status: "done" });
    }

    return { session: mapFocusSession(finished), taskUpdates };
  });

  if ("error" in result) return result;
  revalidateFocusPaths(result.taskUpdates);
  return result;
}

export async function heartbeatFocusSession(
  sessionId: string,
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await lockFocusSession(tx, sessionId, user.id);
    if (!session) {
      return { error: "Focus session not found" };
    }
    if (
      session.pomodoroEnabled &&
      session.pomodoroPhase === "focus" &&
      session.pomodoroPhaseEndsAt &&
      session.pomodoroPhaseEndsAt.getTime() <= now.getTime()
    ) {
      const completed = await completePomodoroFocus(tx, session, now);
      return {
        session: mapFocusSession(completed.session),
        taskUpdates: completed.taskUpdate ? [completed.taskUpdate] : [],
      };
    }
    if (session.status !== "running") {
      return { session: mapFocusSession(session), taskUpdates: [] };
    }

    const elapsedSeconds = getSessionElapsedSeconds(session, now);
    const sync = await syncTrackedTime(tx, session, elapsedSeconds, now);

    const updated = await tx.focusSession.update({
      where: { id: session.id, userId: user.id },
      data: {
        accumulatedSeconds: elapsedSeconds,
        segmentStartedAt: now,
        reportedSeconds: sync.reportedSeconds,
        updatedAt: now,
      },
      include: sessionInclude,
    });

    return {
      session: mapFocusSession(updated),
      taskUpdates: sync.taskUpdate ? [sync.taskUpdate] : [],
    };
  });

  return result;
}
