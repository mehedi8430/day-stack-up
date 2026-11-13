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

  const updated = await tx.focusSession.update({
    where: { id: session.id, userId: session.userId },
    data: {
      accumulatedSeconds: elapsedSeconds,
      segmentStartedAt: null,
      status: "paused",
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

    const paused = await pauseSession(tx, session, now);
    if (paused.taskUpdate) {
      mergeTaskUpdate(taskUpdates, paused.taskUpdate);
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
        session = await tx.focusSession.update({
          where: { id: existing.id, userId: user.id },
          data: {
            status: "running",
            segmentStartedAt: now,
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
): Promise<FocusMutationResult | { error: string }> {
  const user = await requireUser();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const session = await lockFocusSession(tx, sessionId, user.id);
    if (!session) {
      return { error: "Focus session not found" };
    }
    if (session.status === "completed" || session.status === "running") {
      return { session: mapFocusSession(session), taskUpdates: [] };
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
    const session = await lockFocusSession(tx, sessionId, user.id);
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

    const elapsedSeconds = getSessionElapsedSeconds(session, now);
    const sync = await syncTrackedTime(tx, session, elapsedSeconds, now);
    const taskUpdates: PlannerTaskPatch[] = [];
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
