# Task-Linked Focus Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a task-linked count-up focus timer to the planner that records real time against tasks, survives refreshes/navigation, and keeps session history separate from task rows.

**Architecture:** A new `focus_sessions` table persists session state and timestamps. Running elapsed time is derived on the client from persisted timestamps; every pause, finish, switch, and 60-second heartbeat persists elapsed seconds and folds newly completed whole minutes into the task's existing `duration_minutes` aggregate through a `reported_seconds` watermark. A Zustand focus store keeps the header/task controls in sync across day changes, while server actions remain the data layer.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7 over Postgres, Supabase Auth, Zustand, Sonner, date-fns, Tailwind/shadcn primitives.

**Spec:** `docs/superpowers/specs/2026-11-13-focus-timer-design.md`

## Global Constraints

- Every Prisma query and mutation filters by the authenticated `userId`.
- At most one `running` focus session per user; at most one unfinished session per task.
- Elapsed time is always derived from persisted timestamps, never only from a browser interval.
- Finishing is optional for time to count; pause/switch/heartbeat persist it.
- Timer state and task completion are separate, except for the optional "mark done" choice on finish.
- Count-up only. No Pomodoro, reminders, or notifications.
- Timer UI lives in the planner, not the global app header.
- Use existing server-action, Zustand optimistic-update, Sonner, and shadcn patterns.
- Migration-first schema changes. Do not edit historical migrations.
- No test-only methods in production code.

## Review Focus

- **Refresh or navigation while running:** elapsed time must continue from the persisted segment timestamp, not reset to zero.
- **Switching tasks:** the previous session must be paused with its time saved; the new task must not create a second running session.
- **Pause/resume repetition:** repeated pauses must not add the same minutes to the task twice; sub-minute remainders must carry forward.
- **Cross-user access:** a user must not be able to start, pause, finish, or heartbeat another user's task/session by guessing an ID.
- **Task mutation during focus:** moving or deleting a task with an unfinished session must not orphan a running timer or move time to another day.

---

## File Structure

- `prisma/schema.prisma` — add `FocusSession`, relation, indexes.
- `prisma/migrations/20261113120000_add_focus_sessions/migration.sql` — table, FKs, checks, partial unique indexes, RLS.
- `src/lib/focus-types.ts` — shared serializable types and mutation result shape.
- `src/lib/focus-timer.ts` — pure elapsed/format/minute-sync helpers.
- `scripts/focus-timer.test.mjs` — Node tests for the pure helpers.
- `src/app/actions/focus.actions.ts` — session lifecycle and time accounting.
- `src/app/actions/planner.actions.ts` — block moving/deleting tasks with unfinished sessions.
- `src/stores/focus.store.ts` — active session, switch/finish intent, heartbeat.
- `src/stores/planner.store.ts` — apply server task patches locally.
- `src/lib/planner-types.ts` — `PlannerTaskPatch`.
- `src/app/planner/_components/use-focus-elapsed.ts` — one-second display clock.
- `src/app/planner/_components/task-focus-controls.tsx` — per-task controls.
- `src/app/planner/_components/focus-timer-bar.tsx` — compact header timer.
- `src/app/planner/_components/focus-dialogs.tsx` — switch and finish dialogs.
- `src/app/planner/_components/planner-header.tsx` — render the timer bar.
- `src/app/planner/_components/planner-management.tsx` — initialize focus store, heartbeat, dialogs.
- `src/app/planner/_components/task-row.tsx` — task controls.
- `src/app/planner/_components/day-tasks-dialog.tsx` — task controls in the day dialog.
- `src/app/planner/page.tsx` — load the active session with the week.
- `docs/all_features.md`, `docs/analytics-progress.md` — document the feature and changed time source.

---

## Task 1: Add the focus session data model and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261113120000_add_focus_sessions/migration.sql`

**Interfaces:**
- Produces: Prisma model `FocusSession` with fields `id`, `userId`, `taskId`, `status`, `startedAt`, `segmentStartedAt`, `endedAt`, `accumulatedSeconds`, `reportedSeconds`, `createdAt`, `updatedAt`.
- Produces: `DailyPlannerTask.focusSessions` relation.

- [ ] **Step 1: Add the model and relation to `prisma/schema.prisma`**

Add to `DailyPlannerTask`:

```prisma
  focusSessions FocusSession[]
```

Add:

```prisma
model FocusSession {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String    @map("user_id") @db.Uuid
  taskId             String    @map("task_id") @db.Uuid
  status             String    @default("running")
  startedAt          DateTime  @map("started_at") @db.Timestamptz(6)
  segmentStartedAt   DateTime? @map("segment_started_at") @db.Timestamptz(6)
  endedAt            DateTime? @map("ended_at") @db.Timestamptz(6)
  accumulatedSeconds Int       @default(0) @map("accumulated_seconds")
  reportedSeconds    Int       @default(0) @map("reported_seconds")
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  task DailyPlannerTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_focus_sessions_user_id")
  @@index([taskId], map: "idx_focus_sessions_task_id")
  @@index([userId, status], map: "idx_focus_sessions_user_status")
  @@map("focus_sessions")
  @@schema("public")
}
```

- [ ] **Step 2: Generate the migration skeleton**

Run: `npx prisma migrate dev --create-only --name add_focus_sessions`
Expected: a new migration directory with SQL, no database reset.

- [ ] **Step 3: Append the hand-written constraints to the generated migration**

```sql
ALTER TABLE "focus_sessions"
  ADD CONSTRAINT "focus_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "focus_sessions"
  ADD CONSTRAINT "focus_sessions_status_check"
  CHECK ("status" IN ('running', 'paused', 'completed'));

ALTER TABLE "focus_sessions"
  ADD CONSTRAINT "focus_sessions_seconds_check"
  CHECK ("accumulated_seconds" >= 0 AND "reported_seconds" >= 0);

ALTER TABLE "focus_sessions"
  ADD CONSTRAINT "focus_sessions_segment_check"
  CHECK (
    ("status" = 'running' AND "segment_started_at" IS NOT NULL) OR
    ("status" <> 'running' AND "segment_started_at" IS NULL)
  );

ALTER TABLE "focus_sessions"
  ADD CONSTRAINT "focus_sessions_ended_check"
  CHECK (("status" = 'completed') = ("ended_at" IS NOT NULL));

CREATE UNIQUE INDEX "focus_sessions_one_running_per_user"
  ON "focus_sessions" ("user_id") WHERE "status" = 'running';

CREATE UNIQUE INDEX "focus_sessions_one_open_per_task"
  ON "focus_sessions" ("task_id") WHERE "ended_at" IS NULL;

ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus sessions"
  ON "focus_sessions" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own focus sessions"
  ON "focus_sessions" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own focus sessions"
  ON "focus_sessions" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own focus sessions"
  ON "focus_sessions" FOR DELETE USING (auth.uid() = "user_id");
```

- [ ] **Step 4: Apply and validate**

Run: `npx prisma migrate dev`
Expected: migration applies without a reset; Prisma Client regenerates.

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid".

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!".

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261113120000_add_focus_sessions/migration.sql
git commit -m "feat(db): add focus sessions"
```

---

## Task 2: Add pure timer helpers and tests

**Files:**
- Create: `src/lib/focus-types.ts`
- Create: `src/lib/focus-timer.ts`
- Create: `scripts/focus-timer.test.mjs`

**Interfaces:**
- Produces: `FocusSessionStatus`, `FocusSession`, `FocusMutationResult`.
- Produces: `getElapsedSeconds(session, nowMs)`, `formatFocusElapsed(totalSeconds)`, `getTrackedMinuteSync(reportedSeconds, elapsedSeconds)`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/focus-timer.test.mjs` using the same module-resolution hook as `scripts/planner-time.test.mjs`:

```js
import assert from "node:assert/strict";
import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }
    const target = path.join(ROOT, "src", specifier.slice(2));
    return { url: `${pathToFileURL(target).href}.ts`, shortCircuit: true };
  },
});

const { formatFocusElapsed, getElapsedSeconds, getTrackedMinuteSync } =
  await import("../src/lib/focus-timer.ts");

test("running elapsed adds the current segment", () => {
  const session = {
    status: "running",
    accumulatedSeconds: 90,
    segmentStartedAt: "2026-11-13T10:00:00.000Z",
  };

  assert.equal(
    getElapsedSeconds(session, Date.parse("2026-11-13T10:01:00.000Z")),
    150,
  );
});

test("paused and completed sessions ignore the clock", () => {
  const session = {
    status: "paused",
    accumulatedSeconds: 90,
    segmentStartedAt: null,
  };

  assert.equal(getElapsedSeconds(session, Date.now()), 90);
  assert.equal(getElapsedSeconds({ ...session, status: "completed" }, Date.now()), 90);
});

test("elapsed never goes negative on clock skew", () => {
  const session = {
    status: "running",
    accumulatedSeconds: 10,
    segmentStartedAt: "2026-11-13T10:01:00.000Z",
  };

  assert.equal(
    getElapsedSeconds(session, Date.parse("2026-11-13T10:00:00.000Z")),
    10,
  );
});

test("formats focus time as minutes or hours", () => {
  assert.equal(formatFocusElapsed(0), "00:00");
  assert.equal(formatFocusElapsed(65), "01:05");
  assert.equal(formatFocusElapsed(3600), "1:00:00");
  assert.equal(formatFocusElapsed(3661), "1:01:01");
  assert.equal(formatFocusElapsed(-1), "00:00");
});

test("only whole unreported minutes are synced", () => {
  assert.deepEqual(getTrackedMinuteSync(0, 59), {
    minutes: 0,
    reportedSeconds: 0,
  });
  assert.deepEqual(getTrackedMinuteSync(0, 90), {
    minutes: 1,
    reportedSeconds: 60,
  });
  assert.deepEqual(getTrackedMinuteSync(60, 119), {
    minutes: 0,
    reportedSeconds: 60,
  });
  assert.deepEqual(getTrackedMinuteSync(60, 190), {
    minutes: 2,
    reportedSeconds: 180,
  });
  assert.deepEqual(getTrackedMinuteSync(60, 59), {
    minutes: 0,
    reportedSeconds: 60,
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL because `../src/lib/focus-timer.ts` cannot be resolved.

- [ ] **Step 3: Add the shared types**

`src/lib/focus-types.ts`:

```ts
import type { PlannerTaskPatch } from "./planner-types";

export type FocusSessionStatus = "running" | "paused" | "completed";

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  taskDate: string;
  status: FocusSessionStatus;
  startedAt: string;
  segmentStartedAt: string | null;
  endedAt: string | null;
  accumulatedSeconds: number;
  reportedSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface FocusMutationResult {
  session: FocusSession;
  taskUpdates: PlannerTaskPatch[];
}
```

- [ ] **Step 4: Add the pure helpers**

`src/lib/focus-timer.ts`:

```ts
type ElapsedInput = {
  status: string;
  accumulatedSeconds: number;
  segmentStartedAt: string | null;
};

export function getElapsedSeconds(session: ElapsedInput, nowMs: number): number {
  const accumulated = Math.max(0, Math.floor(session.accumulatedSeconds));
  if (session.status !== "running" || !session.segmentStartedAt) {
    return accumulated;
  }

  const segmentStart = Date.parse(session.segmentStartedAt);
  if (Number.isNaN(segmentStart)) return accumulated;

  return accumulated + Math.max(0, Math.floor((nowMs - segmentStart) / 1000));
}

export function formatFocusElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = remainder.toString().padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function getTrackedMinuteSync(
  reportedSeconds: number,
  elapsedSeconds: number,
): { minutes: number; reportedSeconds: number } {
  const reported = Math.max(0, Math.floor(reportedSeconds));
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  const minutes = Math.floor(Math.max(0, elapsed - reported) / 60);

  return { minutes, reportedSeconds: reported + minutes * 60 };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/focus-types.ts src/lib/focus-timer.ts scripts/focus-timer.test.mjs
git commit -m "feat(planner): add focus timer helpers"
```

---

## Task 3: Implement the focus session server actions

**Files:**
- Create: `src/app/actions/focus.actions.ts`
- Modify: `src/lib/planner-types.ts`

**Interfaces:**
- Consumes: `getTrackedMinuteSync`, `FocusSession`, `FocusMutationResult`.
- Produces:

```ts
getActiveFocusSession(): Promise<{ session: FocusSession | null }>
startFocusSession(taskId: string): Promise<FocusMutationResult | { error: string }>
pauseFocusSession(sessionId: string): Promise<FocusMutationResult | { error: string }>
resumeFocusSession(sessionId: string): Promise<FocusMutationResult | { error: string }>
finishFocusSession(sessionId: string, markTaskDone?: boolean): Promise<FocusMutationResult | { error: string }>
heartbeatFocusSession(sessionId: string): Promise<FocusMutationResult | { error: string }>
```

- Produces: `PlannerTaskPatch` in `src/lib/planner-types.ts`.

- [ ] **Step 1: Add `PlannerTaskPatch`**

In `src/lib/planner-types.ts`:

```ts
export interface PlannerTaskPatch {
  id: string;
  durationMinutes?: number | null;
  status?: PlannerStatus;
}
```

- [ ] **Step 2: Implement serialization and elapsed math**

In `src/app/actions/focus.actions.ts`:

- `mapFocusSession(row)` returns the plain `FocusSession`, joining `task.title` and formatting `task.date` as `yyyy-MM-dd`.
- `getSessionElapsedSeconds(session, now)` mirrors `getElapsedSeconds` but accepts Prisma `Date` values.
- `syncTrackedTime(tx, session, elapsedSeconds, now)` calls `getTrackedMinuteSync(session.reportedSeconds, elapsedSeconds)`, and when minutes > 0 reads the scoped task, increments `duration_minutes`, and returns `{ reportedSeconds, taskUpdate }`.
- `pauseRunningSessions(tx, userId, exceptSessionId, now)` finds every running session for the user and pauses it, collecting task updates.
- All session updates use `where: { id, userId }`.

- [ ] **Step 3: Implement `getActiveFocusSession`**

Query a `running` session first, then the most recently updated `paused` session, both with `endedAt: null` and `userId: user.id`. Include the task title/date. Return `{ session: null }` when none.

- [ ] **Step 4: Implement `startFocusSession`**

1. `requireUser()`.
2. Find the task with `{ id: taskId, userId: user.id }`; return `{ error: "Task not found" }` when absent.
3. In one transaction: pause other running sessions, find the task's unfinished session, resume it when paused, or create a running session with `startedAt` and `segmentStartedAt` set to now.
4. Return the mapped session plus collected task updates.
5. Call `revalidatePath("/planner")` and `revalidatePath("/analytics")` when task updates exist.

- [ ] **Step 5: Implement pause, resume, finish, heartbeat**

- `pauseFocusSession`: return the session unchanged when already paused; otherwise persist elapsed, set `accumulatedSeconds`, clear `segmentStartedAt`, set `paused`.
- `resumeFocusSession`: pause other running sessions, then set the target to `running` with `segmentStartedAt: now`.
- `finishFocusSession`: if not already completed, persist elapsed, set `completed`, `endedAt: now`, clear the segment. When `markTaskDone`, also set the task `status: "done"` and add/merge that into `taskUpdates`.
- `heartbeatFocusSession`: only for a running session; persist elapsed and re-base `segmentStartedAt` to now. Do not call `revalidatePath` from heartbeat.
- Every action returns `{ error: "Focus session not found" }` when the scoped session is missing.

- [ ] **Step 6: Validate**

Run: `npm run lint`
Expected: no errors.
Run: `npm test`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/actions/focus.actions.ts src/lib/planner-types.ts src/lib/focus-types.ts
git commit -m "feat(planner): add focus session actions"
```

---

## Task 4: Guard task mutations and add local task patching

**Files:**
- Modify: `src/app/actions/planner.actions.ts`
- Modify: `src/stores/planner.store.ts`

**Interfaces:**
- Consumes: `PlannerTaskPatch`.
- Produces: planner store method `applyTaskUpdates(updates: PlannerTaskPatch[]): void`.

- [ ] **Step 1: Block moving a task with an unfinished session**

In `movePlannerTaskToDate`, load `durationMinutes` plus an open focus session:

```ts
select: {
  durationMinutes: true,
  focusSessions: {
    where: { endedAt: null },
    select: { id: true },
    take: 1,
  },
}
```

Return `{ error: "Finish the focus timer before moving this task to another day" }` when an open session exists. Keep the existing logged-time guard.

- [ ] **Step 2: Block deleting a task with an unfinished session**

In `deletePlannerTask`, first find the task with an open session scoped to `user.id`. Return `{ error: "Finish the focus timer before deleting this task" }` when found.

- [ ] **Step 3: Add `applyTaskUpdates` to the planner store**

Add to the state interface and implementation:

```ts
applyTaskUpdates: (updates) => {
  if (updates.length === 0) return;
  const byId = new Map(updates.map((update) => [update.id, update]));
  set((state) => ({
    tasks: state.tasks.map((task) => {
      const update = byId.get(task.id);
      return update ? { ...task, ...update } : task;
    }),
  }));
},
```

- [ ] **Step 4: Validate**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/planner.actions.ts src/stores/planner.store.ts
git commit -m "feat(planner): guard focused tasks and patch time locally"
```

---

## Task 5: Wire the page, focus store, and display clock

**Files:**
- Create: `src/stores/focus.store.ts`
- Create: `src/app/planner/_components/use-focus-elapsed.ts`
- Modify: `src/app/planner/page.tsx`
- Modify: `src/app/planner/_components/planner-management.tsx`

**Interfaces:**
- Consumes: focus actions, `FocusSession`, planner store `applyTaskUpdates`.
- Produces: `useFocusStore` and `useFocusElapsed(session)`.

- [ ] **Step 1: Add the focus store**

State:

```ts
interface FocusState {
  activeSession: FocusSession | null;
  pendingSwitchTaskId: string | null;
  finishingSessionId: string | null;
  isMutating: boolean;
  initialize(session: FocusSession | null): void;
  reset(): void;
  requestStart(taskId: string): Promise<void>;
  confirmSwitch(): Promise<void>;
  cancelSwitch(): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  requestFinish(): void;
  cancelFinish(): void;
  confirmFinish(markTaskDone: boolean): Promise<void>;
  heartbeat(): Promise<void>;
}
```

Behavior:
- `requestStart` opens the switch dialog only when a different task is currently `running`; otherwise it starts immediately.
- A successful action applies `taskUpdates` through `usePlannerStore.getState().applyTaskUpdates(...)` and sets `activeSession`.
- `confirmFinish` calls `finishFocusSession` and then clears `activeSession` and `finishingSessionId`.
- `heartbeat` returns quietly on error so a flaky network does not break the timer.
- `reset` clears all state. Use a request generation counter so a late response cannot revive a reset store.

- [ ] **Step 2: Add the display clock hook**

`useFocusElapsed(session)` returns:
- the stored accumulated seconds for paused/completed sessions;
- for running sessions, one `Date.now()` tick per second after mount;
- a stable initial value before the effect runs, so server rendering and hydration do not disagree.

- [ ] **Step 3: Load the active session with the planner page**

In `src/app/planner/page.tsx`, fetch `getPlannerTasksBetween(start, end)` and `getActiveFocusSession()` together and pass `initialFocusSession` into `PlannerManagement`.

- [ ] **Step 4: Initialize and heartbeat in `PlannerManagement`**

- Add `initialFocusSession` to props.
- Initialize both stores in the existing mount effect and reset both on cleanup.
- Add an effect keyed on `activeSession?.status` that calls `heartbeat()` every 60 seconds while running.
- Render `<SwitchFocusDialog />` and `<FinishFocusDialog />` at the root beside the existing dialogs.

- [ ] **Step 5: Validate**

Run: `npm run lint`
Expected: no errors.
Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/stores/focus.store.ts src/app/planner/_components/use-focus-elapsed.ts src/app/planner/page.tsx src/app/planner/_components/planner-management.tsx
git commit -m "feat(planner): wire focus state and heartbeat"
```

---

## Task 6: Add the header timer and per-task controls

**Files:**
- Create: `src/app/planner/_components/focus-timer-bar.tsx`
- Create: `src/app/planner/_components/task-focus-controls.tsx`
- Modify: `src/app/planner/_components/planner-header.tsx`
- Modify: `src/app/planner/_components/task-row.tsx`
- Modify: `src/app/planner/_components/day-tasks-dialog.tsx`

**Interfaces:**
- Consumes: `useFocusStore`, `useFocusElapsed`, `formatFocusElapsed`.
- Produces: `<FocusTimerBar />`, `<TaskFocusControls task={task} compact? />`.

- [ ] **Step 1: Build `FocusTimerBar`**

Render nothing when no active session. Otherwise show:
- a status dot (green running, amber paused);
- a truncated task title that selects the task's date when clicked;
- `formatFocusElapsed(elapsed)` in tabular numerals;
- pause/resume and finish icon buttons with aria labels;
- `role="timer"` without a live region that announces every second.

Place it under the header description so it remains visible on mobile and desktop while the user changes days.

- [ ] **Step 2: Build `TaskFocusControls`**

- Inactive, non-terminal task: a ghost icon button labelled "Start focus timer".
- Active task: pause/resume and finish buttons, with elapsed time when not compact.
- Terminal tasks that are not active render nothing.
- Use `runPlannerAction` for errors/toasts.
- Disable controls while `isMutating`.

- [ ] **Step 3: Add controls to task surfaces**

- `task-row.tsx`: add `<TaskFocusControls task={task} />` in the action group.
- `day-tasks-dialog.tsx`: add `<TaskFocusControls task={task} compact />` in the row actions.
- `planner-header.tsx`: render `<FocusTimerBar />` under the description.

- [ ] **Step 4: Validate**

Run: `npm run lint`
Expected: no errors.
Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/planner/_components/focus-timer-bar.tsx src/app/planner/_components/task-focus-controls.tsx src/app/planner/_components/planner-header.tsx src/app/planner/_components/task-row.tsx src/app/planner/_components/day-tasks-dialog.tsx
git commit -m "feat(planner): show focus timer and task controls"
```

---

## Task 7: Add switch and finish dialogs

**Files:**
- Create: `src/app/planner/_components/focus-dialogs.tsx`

**Interfaces:**
- Consumes: `useFocusStore`, `usePlannerStore`, `ConfirmDialog`, `Dialog`.
- Produces: `<SwitchFocusDialog />`, `<FinishFocusDialog />`.

- [ ] **Step 1: Build the switch dialog**

Use `ConfirmDialog` with `variant="default"`. When `pendingSwitchTaskId` is set:
- Resolve both task titles from the planner store.
- Title: "Switch focus?"
- Description: name the running task and the new task; explain that the current timer will pause and keep its time.
- Confirm: "Switch focus"; cancel: "Keep current timer".
- Confirm calls `confirmSwitch()` and catches errors with a toast.

- [ ] **Step 2: Build the finish dialog**

Use `Dialog` with:
- Title "Finish focus session?"
- Task title and final elapsed time.
- A checkbox labelled "Mark this task as done".
- Default unchecked unless the task is already done.
- Cancel and "Save time" buttons.
- Confirm calls `confirmFinish(markDone)` and catches errors with a toast.

- [ ] **Step 3: Validate**

Run: `npm run lint`
Expected: no errors.
Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/planner/_components/focus-dialogs.tsx
git commit -m "feat(planner): confirm focus switches and finishes"
```

---

## Task 8: Update feature documentation

**Files:**
- Modify: `docs/all_features.md`
- Modify: `docs/analytics-progress.md`

**Interfaces:**
- Consumes: the implemented behavior.

- [ ] **Step 1: Document the planner timer**

Under Daily Planner, add:
- start/pause/resume/finish controls per task;
- compact header timer that survives day changes and reloads;
- switch confirmation and saved previous time;
- automatic 60-second persistence;
- optional mark-done on finish;
- one running session per user.

Under Data Layer, add `focus_sessions` with its columns and the rule that task `duration_minutes` is the aggregate.

- [ ] **Step 2: Update the Time Worked description**

In `docs/analytics-progress.md`, change the Time Worked row from "sum of `durationMinutes` recorded in the task editor" to "manual minutes plus whole minutes persisted by focus sessions"; note that sub-minute remainders carry to the next sync and that moving/deleting a task with an unfinished session is blocked.

- [ ] **Step 3: Commit**

```bash
git add docs/all_features.md docs/analytics-progress.md
git commit -m "docs: describe the planner focus timer"
```

---

## Task 9: Full validation

**Files:** none.

- [ ] **Step 1: Run the test suite**

Run: `npm test`
Expected: all tests pass, including `focus-timer.test.mjs`.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: `prisma generate` and `next build` succeed.

- [ ] **Step 4: Verify the migration**

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!".

- [ ] **Step 5: Manual smoke check**

Run `npm run dev`, then in the planner:
1. Start a task, confirm the header timer appears and counts up.
2. Change days, confirm the timer keeps counting.
3. Reload, confirm the timer returns with the elapsed time.
4. Start another task, confirm the switch dialog appears; confirm the previous task's logged minutes are preserved and the old timer is paused.
5. Pause, resume, finish with and without "mark done".
6. Confirm the sidebar's "Time logged" and `/analytics` Time Worked reflect the minutes.
7. Try moving/deleting a task with an unfinished timer; confirm the guard message.

- [ ] **Step 6: Final commit if the smoke check required fixes**

```bash
git add -A
git commit -m "fix(planner): polish focus timer behavior"
```

---

## Self-Review

**Spec coverage:** Session table and statuses (Task 1), count-up math and formatting (Task 2), start/pause/resume/finish/heartbeat with one running session (Task 3), switch preservation (Tasks 3 and 7), header timer and per-task controls (Task 6), optional mark-done (Tasks 3 and 7), refresh/navigation resilience (Tasks 2, 3, and 5), time accounting into analytics (Tasks 3 and 4), docs (Task 8), validation (Task 9).

**Type consistency:** `FocusSession`, `FocusMutationResult`, and `PlannerTaskPatch` are defined once and reused. Action names in the store match Task 3. `reportedSeconds` is the only watermark name. The task aggregate remains `durationMinutes`.

**Review-focus tests:** Refresh/navigation is exercised by the elapsed helper and persisted heartbeat; switch/double-count behavior is exercised by the minute-sync tests and the single-running transaction; auth scoping and task mutation guards are code-reviewed in Tasks 3 and 4; the manual smoke check covers the end-to-end flows.
