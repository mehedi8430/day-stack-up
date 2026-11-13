import type { FocusSession as FocusSessionModel, Prisma } from "@prisma/client";
import { getTrackedMinuteSync } from "./focus-timer";
import type { PlannerTaskPatch } from "./planner-types";

export const sessionInclude = {
  task: {
    select: {
      title: true,
      date: true,
    },
  },
} satisfies Prisma.FocusSessionInclude;

export type FocusSessionRow = Prisma.FocusSessionGetPayload<{
  include: typeof sessionInclude;
}>;

export function getSessionElapsedSeconds(
  session: Pick<
    FocusSessionModel,
    "status" | "accumulatedSeconds" | "segmentStartedAt"
  >,
  now: Date,
): number {
  const accumulated = Math.max(0, Math.floor(session.accumulatedSeconds));
  if (session.status !== "running" || !session.segmentStartedAt) {
    return accumulated;
  }

  return (
    accumulated +
    Math.max(
      0,
      Math.floor((now.getTime() - session.segmentStartedAt.getTime()) / 1000),
    )
  );
}

export function mergeTaskUpdate(
  updates: PlannerTaskPatch[],
  update: PlannerTaskPatch,
): void {
  const existing = updates.find((item) => item.id === update.id);
  if (existing) {
    Object.assign(existing, update);
  } else {
    updates.push(update);
  }
}

/**
 * Locks and loads a focus session for the duration of the transaction.
 *
 * Every session mutation goes through this so concurrent heartbeats, pauses,
 * finishes, or switches for the same session serialize instead of acting on
 * stale `reported_seconds` and `accumulated_seconds` values.
 */
export async function lockFocusSession(
  tx: Prisma.TransactionClient,
  sessionId: string,
  userId: string,
): Promise<FocusSessionRow | null> {
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "focus_sessions"
    WHERE "id" = ${sessionId}::uuid AND "user_id" = ${userId}::uuid
    FOR UPDATE
  `;
  if (locked.length === 0) return null;

  return tx.focusSession.findFirst({
    where: { id: sessionId, userId },
    include: sessionInclude,
  });
}

export async function syncTrackedTime(
  tx: Prisma.TransactionClient,
  session: Pick<
    FocusSessionModel,
    "id" | "userId" | "taskId" | "reportedSeconds"
  >,
  elapsedSeconds: number,
  now: Date,
): Promise<{
  reportedSeconds: number;
  taskUpdate?: PlannerTaskPatch;
}> {
  const sync = getTrackedMinuteSync(session.reportedSeconds, elapsedSeconds);
  if (sync.minutes === 0) {
    return { reportedSeconds: sync.reportedSeconds };
  }

  // Compare-and-swap the watermark: only the mutation that advances it from
  // the value it observed may add minutes to the task. A stale pause or
  // heartbeat that lost the race returns the current watermark and does not
  // touch the task.
  const claimed = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      userId: session.userId,
      reportedSeconds: session.reportedSeconds,
    },
    data: { reportedSeconds: sync.reportedSeconds },
  });
  if (claimed.count === 0) {
    const current = await tx.focusSession.findFirst({
      where: { id: session.id, userId: session.userId },
      select: { reportedSeconds: true },
    });
    return {
      reportedSeconds: current?.reportedSeconds ?? session.reportedSeconds,
    };
  }

  // Atomic increment so concurrent manual edits or another session cannot
  // make this write lose a minute; COALESCE handles a null duration.
  const updatedRows = await tx.$queryRaw<
    Array<{ duration_minutes: number }>
  >`
    UPDATE "daily_planner_tasks"
    SET "duration_minutes" = COALESCE("duration_minutes", 0) + ${sync.minutes},
        "updated_at" = ${now}
    WHERE "id" = ${session.taskId}::uuid
      AND "user_id" = ${session.userId}::uuid
    RETURNING "duration_minutes"
  `;
  if (updatedRows.length === 0) {
    return { reportedSeconds: sync.reportedSeconds };
  }

  return {
    reportedSeconds: sync.reportedSeconds,
    taskUpdate: {
      id: session.taskId,
      durationMinutes: updatedRows[0].duration_minutes,
    },
  };
}
