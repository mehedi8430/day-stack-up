import assert from "node:assert/strict";
import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const target = path.join(ROOT, "src", specifier.slice(2));
      return { url: `${pathToFileURL(target).href}.ts`, shortCircuit: true };
    }
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:") &&
      context.parentURL.endsWith(".ts")
    ) {
      const target = new URL(specifier, context.parentURL);
      return { url: `${target.href}.ts`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const runDbTests =
  process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);

test(
  "a stale focus snapshot cannot sync the same minutes twice",
  {
    skip: runDbTests
      ? false
      : "set RUN_DB_TESTS=1 with DATABASE_URL to run database tests",
  },
  async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { syncTrackedTime } = await import("../src/lib/focus-accounting.ts");

    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });

    const userId = crypto.randomUUID();
    const taskId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const segmentStartedAt = new Date(now.getTime() - 90_000);

    try {
      await prisma.$executeRaw`
        INSERT INTO auth.users (id, email)
        VALUES (${userId}::uuid, ${`focus-test-${userId}@example.com`})
      `;
      await prisma.$executeRaw`
        INSERT INTO daily_planner_tasks
          (id, user_id, title, date, duration_minutes, priority, status, position)
        VALUES
          (${taskId}::uuid, ${userId}::uuid, 'Focus accounting test', CURRENT_DATE, NULL, 'low', 'planned', 0)
      `;
      await prisma.$executeRaw`
        INSERT INTO focus_sessions
          (id, user_id, task_id, status, started_at, segment_started_at, accumulated_seconds, reported_seconds)
        VALUES
          (${sessionId}::uuid, ${userId}::uuid, ${taskId}::uuid, 'running', ${segmentStartedAt}, ${segmentStartedAt}, 0, 0)
      `;

      const stale = await prisma.focusSession.findFirstOrThrow({
        where: { id: sessionId },
      });

      // Both calls see reported_seconds = 0 (90 elapsed seconds = 1 whole
      // minute). A pause and an in-flight heartbeat can produce exactly this
      // pair of calls from the same stale snapshot.
      await prisma.$transaction((tx) =>
        syncTrackedTime(tx, stale, 90, now),
      );
      await prisma.$transaction((tx) =>
        syncTrackedTime(tx, stale, 90, now),
      );

      const task = await prisma.dailyPlannerTask.findFirstOrThrow({
        where: { id: taskId },
      });
      const session = await prisma.focusSession.findFirstOrThrow({
        where: { id: sessionId },
      });

      assert.equal(task.durationMinutes, 1);
      assert.equal(session.reportedSeconds, 60);
    } finally {
      await prisma.$executeRaw`
        DELETE FROM daily_planner_tasks WHERE id = ${taskId}::uuid
      `;
      await prisma.$executeRaw`
        DELETE FROM auth.users WHERE id = ${userId}::uuid
      `;
      await prisma.$disconnect();
    }
  },
);
