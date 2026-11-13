# Task-Linked Focus Timer — Design

**Date:** 2026-11-13
**Status:** Approved for implementation

## Intent

Planner tasks currently let users type minutes after the fact. This feature lets
them start a focus timer on a task and records the time they actually spent, so
the planner reflects real work rather than a guessed total.

## Goals

- Start, pause, resume, and finish a focus timer from a planner task.
- Keep a compact running/paused timer in the planner header while the user
  changes days or reloads the page.
- Persist elapsed time automatically. Finishing a session is not required for
  time to count.
- Ask before switching focus away from a running task, and keep the previous
  task's elapsed time.
- Keep focus-session history separate from planner task rows.
- Allow one running timer per user while permitting paused sessions to remain
  resumable.

## Non-goals

- Pomodoro presets, countdowns, reminders, or notifications.
- A global timer outside the planner page.
- A session-history screen. Sessions are stored and statused for later analysis.
- Changing how habit progress is calculated.

## Data model

New `focus_sessions` table:

| Column | Meaning |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | Owner, scoped on every read and write |
| `task_id` | Planner task; cascades on task deletion |
| `status` | `running`, `paused`, or `completed` |
| `started_at` | When the session first started |
| `segment_started_at` | Start of the current running segment; null when paused/completed |
| `ended_at` | Set when the session is finished |
| `accumulated_seconds` | Whole seconds accrued before the current segment |
| `reported_seconds` | Seconds already folded into the task's `duration_minutes` |
| timestamps | `created_at`, `updated_at` |

Elapsed time is always derived:

```
running:   accumulated_seconds + floor((now - segment_started_at) / 1000)
paused:    accumulated_seconds
completed: accumulated_seconds
```

A partial unique index allows one `running` session per user. A second partial
unique index allows one unfinished session per task, so resuming cannot create
duplicates.

## Time accounting

`daily_planner_tasks.duration_minutes` remains the analytics aggregate. It can
include both manually entered minutes and timer time.

When a session is paused, finished, switched away from, or heartbeated, the
server compares elapsed seconds with `reported_seconds`. Whole minutes are added
to the task's `duration_minutes` and `reported_seconds` advances by that many
seconds. Sub-minute remainders stay unreported and are picked up later. This
avoids double-counting on repeated pauses and keeps the analytics dashboard and
planner sidebar correct without changing their calculations.

## Session lifecycle

- **Start:** validate the task belongs to the user. Pause any other running
  session. Resume the task's existing unfinished session or create one.
- **Pause:** persist elapsed seconds into `accumulated_seconds`, clear the
  current segment, set status `paused`.
- **Resume:** pause any other running session, set `segment_started_at` to now.
- **Finish:** pause/accumulate one last time, set `ended_at`, status
  `completed`, and optionally mark the planner task `done`.
- **Heartbeat:** while running, every 60 seconds the client persists elapsed
  time and re-bases the current segment. This keeps time saved without requiring
  a finish and without losing it on refresh.
- **Switch:** if another task is running, the UI asks for confirmation. On
  confirmation the previous session is paused (not discarded) and the new
  session starts. Elapsed time on the previous task remains saved.

## UI

- `FocusTimerBar` in the planner header shows the current task, elapsed time,
  pause/resume, and finish. It also shows a paused session.
- Each non-terminal task row gets a focus control: start, or pause/resume plus
  finish when that task owns the active session.
- Finish opens a small dialog with an optional "Mark task as done" checkbox.
  Timer state and completion remain separate.
- Switching opens a confirmation dialog naming both tasks.

## Success measures

- Percentage of started focus sessions that reach `completed` or `paused`
  rather than being abandoned while running.
- Whether tasks with tracked focus time are finished at a higher rate.
- Whether tracked minutes show up in the planner sidebar and analytics.

## Security and data rules

- Every focus query and mutation filters by the authenticated `userId`.
- A task can only be started if it belongs to the same user.
- Moving or deleting a task with an unfinished focus session is rejected.
- RLS and CHECK constraints ship in the migration as defense-in-depth.

## Verification

- Pure timer math has Node tests.
- `npm test`, `npm run lint`, and `npm run build` pass.
- Migration applies cleanly and `prisma migrate status` reports up to date.
