# Home & Analytics Progress

This note explains how the Home progress card and `/analytics` metrics are
derived. The shared calculations live in `src/lib/habit-progress.ts`; date and
streak helpers live in `src/lib/date.ts`.

## Shared progress rules

- A habit counts from its creation date. Before that, it contributes neither
  completions nor target.
- Each eligible date adds `weekly target / 7` to the goal. The effective target
  comes from `habit_schedules`; a change affects dates from its effective date,
  not earlier history.
- Weekly-target edits take effect from the start of the current Saturday–Friday
  week. Earlier weeks retain the target that was in effect then.
- Calendar habits appear only for ranges that overlap their creation date;
  dates before creation are not checkable.
- Only completed rows count. Overall rates pool completed days and target shares
  across habits, then calculate `completed / target × 100`. This weights habits
  by their goals and can exceed 100% when goals are exceeded.
- A missing or zero target produces `N/A` in analytics. Achievement levels use
  the shared thresholds in `src/lib/date.ts`.

## Home dashboard

The overall progress card uses the current Saturday–Friday week. Its target
covers the full week, while its completed count includes completed habits only
through today. The percentage determines the progress bar and level badge.
Habit check-ins update local state optimistically and refresh the card.

## Calendar counters

The per-habit counter uses the same schedule history and per-date target shares:
each eligible date contributes its effective weekly target divided by seven.
The shares are summed across the visible week, month, or 15-day range and
rounded to a whole number for display. This means complete weeks contribute
their weekly target, partial weeks contribute proportionally, and dates before
the habit's creation do not contribute.

## Analytics

The Week, Month, and Year selector controls the main completion KPI and charts:

| Metric | Calculation |
| --- | --- |
| Period completion | Pooled completed habit-days divided by target shares for the selected week, month, or year. The selected period's target covers the full period; future completions are not counted. |
| Level badge | Achievement level for the selected period's completion rate. |
| 30-day consistency | Pooled completion rate over today and the prior 29 days, compared with the preceding 30 days. This is rolling and does not change with the selected view. |
| Active habits | Number of habits currently being tracked. |
| Daily Score | Each selected day’s pooled completion rate versus its eligible target shares. Future days have no score. Bar and Line are display choices only. |
| Per-Habit Completion | Each habit's completed count versus its target shares in the selected week or month. |
| Monthly Completion | In Year view, each month's pooled completion rate against that month's target. Future months are `N/A`; the current month uses a full-month target. |
| Yearly Heatmap | In Year view, each date's completed count divided by that date's target shares. Future dates display no completions. |
| Streaks | Current and best runs of completed calendar days per habit, over its history. The current run includes today if completed; otherwise it is counted through yesterday. |
| Habit Stability | Weekly completion counts for up to 12 completed Saturday–Friday weeks. The current week and the habit's creation week are excluded. Stability describes variation in counts, not goal attainment: fewer than four weeks is Building, zero average is Inactive; otherwise standard deviation ≤1.25 is High, ≤2.25 is Moderate, and higher is Low. |
| Time Worked | Sum of planner task `durationMinutes`: minutes entered manually in the task editor plus whole minutes persisted by focus sessions; task status does not affect the total. Focus time is synced incrementally — each pause, finish, switch, or 60-second heartbeat adds newly completed whole minutes, and sub-minute remainders carry forward to the next sync, so repeated pauses cannot double-count. User-configurable work goals (default: 8 hours/day and 5 qualifying days/week) are stored in the extensible user-settings table. A qualifying day reaches the saved daily target; the weekly hours target is daily target × qualifying days. Weeks run Saturday–Friday. Month view summarizes logged hours, qualifying days, and average time per day with logged time; the chart can group by day or Saturday–Friday weeks. Year view groups logged time by month. Daily charts show the configured target line. Tasks with recorded time cannot be moved to another day, and tasks with an unfinished focus session cannot be moved or deleted, preserving the date associated with the work. |

The analytics page receives user-scoped habits, completions, schedules, and
planner tasks and work goals from server actions. It uses shared progress
helpers for rates; charts format those results rather than defining separate
progress rules.

## Settings

`user_settings` stores user-owned JSON values by key. Add new settings by
registering a stable key and a typed parser/default in `src/lib/settings.ts`,
then read and update that key through authenticated server actions. This keeps
future preferences out of feature-specific table columns while retaining
per-user query scoping and RLS.
