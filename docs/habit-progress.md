# Habit Progress (`/progress`)

Status: implemented on branch `feat/habit-progress`. The original v1 (daily-only
model, commits `93644e9`, `b9bd1ac`, `7223586`) was superseded by the
weekly-target model documented here (migration
`20261025120000_habit_weekly_targets`).
Last updated: October 25, 2026.

## 1. Overview

Habit Progress is a read-only reporting page that shows each habit's progress
toward its **weekly target** for a selected week or month, compared with the
directly preceding period. Every habit has a target of N days per week
(1–7); `7` is "every day" and is the default. The page answers four questions
for every habit:

1. What percentage of the period **target** was completed
   (`completed occurrences / target × 100`)?
2. How many days were completed versus the period target (`3/5`, `5/22.1`)?
3. Did performance improve, decline, or stay flat versus the previous period?
4. What achievement level does the habit hold, and did that level change?

The period selection, comparison math, level badges, and N/A rules are shared
between the weekly and monthly views, so both views behave identically.

## 2. Entry point and access

- The page lives at `/progress`. Its on-page title is **"The Day Stack"**
  (the inspirational display name; the navigation link still says "Progress"
  for orientation).
- It is opened from the **home page header's right side** ("Progress" button,
  below the global navigation). It is intentionally **not** in the main
  navigation or the mobile menu.
- The route is protected in two places, consistent with the rest of the app:
  - `src/proxy.ts` redirects unauthenticated visits to `/login`.
  - `src/app/progress/page.tsx` also redirects when `getInitialData()` reports
    no authenticated user.
- The page is dynamic (server-rendered on demand) and read-only; habit and
  completion mutations stay on the calendar. The habit form's **Weekly target**
  select lives there too (see §5.3).

## 3. Data model

### 3.1 Weekly target on `habits`

`habits.weekly_target INTEGER NOT NULL DEFAULT 7` with a CHECK constraint
(`BETWEEN 1 AND 7`) holds the habit's current target. "Daily" is target 7 —
there is no separate frequency enum, so existing daily habits needed no
reconfiguration.

### 3.2 Effective-dated history `habit_schedules`

Target changes must not rewrite history, so every target lives in
`habit_schedules`:

| Column | Meaning |
| --- | --- |
| `id` | UUID PK |
| `user_id` | FK `auth.users(id)` ON DELETE CASCADE; RLS-scoped like the other tables |
| `habit_id` | FK `habits(id)` ON DELETE CASCADE |
| `starts_on` | DATE, inclusive first day the target applies; `UNIQUE (habit_id, starts_on)` |
| `weekly_target` | the target for that span, `CHECK 1–7` |
| `created_at` | row bookkeeping |

The row with the greatest `starts_on ≤ date` is that date's target. Editing a
habit's target inserts (or same-day upserts) one row effective **today**; all
dates before it keep the previous row.

### 3.3 Migration and safe defaults

`prisma/migrations/20261025120000_habit_weekly_targets/migration.sql`:

- adds `habits.weekly_target` (default 7) + CHECK constraint,
- creates `habit_schedules` with FKs, CHECK, unique and user indexes,
- **backfills one schedule row per existing habit** at
  `starts_on = DATE(created_at)` with target 7 — every pre-existing habit
  becomes a daily habit, completion data is untouched, and projected numbers
  for daily habits are identical to the old model,
- enables RLS with the standard four owner-scoped policies.

Deployment note: the migration was validated locally (Docker Postgres,
upgrade path over seeded data; CHECK + RLS verified). **It is committed but
not yet applied to the remote Supabase database** — run `npm run db:deploy`
when ready.

### 3.4 Reads and writes

- `getInitialData()` (server action) additionally returns the user's
  `schedules` (`{ habit_id, starts_on, weekly_target }`) and each habit's
  `weeklyTarget`; all reads stay scoped to the authenticated user.
- `addHabit()` writes the habit and its first schedule row (anchored to the
  habit's creation date) in one transaction.
- `updateHabit()` skips schedule writes when the target is unchanged; on a
  change it upserts the row for today.
- `deleteHabit()` cascades to completions **and** schedules.

## 4. Period model

`getProgressPeriod(view, cursor, today)` in `src/lib/habit-progress.ts`
describes the period being viewed. Weeks are **month-anchored** (1–7, 8–14,
15–21, 22–28, 29–month end), so the final week of a month can be shorter than
seven days; months are calendar months.

| Field | Meaning |
| --- | --- |
| `view` | `"week"` or `"month"` |
| `start` | First calendar day of the period |
| `end` | Last calendar day of the period, including future days |
| `effectiveEnd` | Last day completions are counted (`today` for the current period); targets use the full period instead |
| `totalDays` | Calendar length (1–7 for a week, or 28–31 for a month) |
| `elapsedDays` | Days through the effective end; `0` for a future period |
| `isCurrent` | `today` falls inside the period |
| `isFuture` | The period starts after today |

Navigation behavior:

- Previous/next step one month-anchored week bucket or one month at a time;
  navigation crosses month boundaries without skipping a short final week.
  Forward navigation is disabled at the current period.
- "This week" / "This month" resets the cursor.
- The period label is `Oct 22 – Oct 28, 2026` (weeks) or `MMMM yyyy` (months),
  announced through `aria-live`.

## 5. Targets and eligibility

### 5.1 Per-date target share

For each calendar date the habit resolves its effective weekly target from
schedule history (`resolveWeeklyTarget`) and contributes
`weeklyTarget / 7` to the period target. No target shares are lost to
rounding inside the math: the *displayed* target is rounded for people
(`formatTargetCount`), while percentages use the raw sum.

### 5.2 Eligibility

A date contributes share only when the habit already existed
(`isHabitEligibleOn`, `date ≥ DATE(created_at)` as a date-only comparison, so
server and client agree across timezones). Dates before creation contribute
nothing. Future dates after creation **do** contribute — they are part of the
goal the user is progressing toward.

### 5.3 Choosing a target

The calendar's habit form (also used for editing) has a **Weekly target**
select: *Every day* (7, default) or *1–6 days / week*, e.g. "exercise
5 days a week". Changing the target starts today; past progress keeps the
previous target (shown in the helper text). Progress cards display the target
next to the category (`Fitness · 5 days / week`).

### 5.4 Core formulas

```
target     = sum over eligible dates of (resolved weeklyTarget / 7)
completed  = eligible dates with a completion, counted once per date
             (rows are unique per habit/day; false rows are dropped)
percentage = (completed / target) × 100     – may exceed 100
level      = getLevel(percentage)           – OKR thresholds unchanged
```

- **Current periods use the full-period target** (target spans the whole
  week/month, including days after today), so the percentage reads as "how far
  toward the goal". Completed days still count only through today.
- Weekly: a habit that exists all week with target 5 has target `5` — exactly
  `completed occurrences / weekly target × 100`. Created mid-week, its target
  is proportional (`5 × 5/7` for the eligible days).
- Monthly: target = `weeklyTarget/7 × eligible days in the month`
  (e.g. 5 days/week across October = `5/7 × 31 ≈ 22.1`), trimmed to the
  creation date and replayed across mid-month target changes.
- `target == 0` (future/not-created period, corrupt zero target) → percentage
  and level render **N/A**, never a misleading `0%`. Malformed/out-of-range
  schedule values fall back to 7 (`sanitizeWeeklyTarget`); a true 0 survives
  as N/A.
- Overachievement: more completions than the allocated share (7 done for a
  target of 5) yields a percentage **above 100%** (e.g. 140% → Legendary).
  Progress bars fill at most to 100%; the surrounding text shows the real
  percentage and `aria-valuetext` announces it uncapped.

### 5.5 Shared use on the home calendar

The home calendar's overall range bar (`CalendarGrid`) uses `computeRangeRate`
with the same target/eligibility/history rules, applied to the **elapsed days
of the selected range** (week, month, or last 15 days) rather than the full
period. That keeps the bar a "how far so far" pace indicator while fixing the
old daily-only math: a 5-days/week habit is no longer counted as due seven
days a week, and days before a habit existed no longer drag the percentage
down. Percentages can exceed 100%; the bar fills to 100% while
`aria-valuetext` carries the raw value. The per-habit `X/days` cell counters
remain raw completion counts for the visible range.

## 6. Comparison with the previous period

`getPreviousProgressPeriod(current)` returns the immediately preceding
month-anchored week bucket or calendar month **at full length**. v2 compares
**goal with goal**: each period is measured against its own full-period
target, so the previous period is no longer clipped to the current period's
elapsed days (that clipping belonged to the daily-pace model of v1). The page
copy states this explicitly for in-progress periods
("Comparing full-period goals…"), because a mid-week percentage naturally
trails a completed period.

| Metric | Rule |
| --- | --- |
| `percentageDelta` | `current.percentage − previous.percentage`; N/A when either side has no target |
| `completedDelta` | `current.completed − previous.completed`; N/A when either target is 0 |
| `trend` | `↑` improves, `↓` declines, `→` unchanged, `N/A` otherwise |
| `completedTrend` | same logic on the day count |
| `levelTrend` | compares levels by rank; N/A when either level is missing |

Display rules:

- Percentages round to the nearest whole number; point changes show one
  decimal (`+14.3 pts`), consistent with the derived directions.
- Day deltas show signed whole days (`+2 days`, `−1 day`).
- Targets render via `formatTargetCount`: whole numbers stay whole
  (`5`, `31`), fractional targets get one decimal (`22.1`, `7.9`).
- The current period banner shows `Day X of Y · progress is measured against
  the full period target, including days after today.`

## 7. Achievement levels

Unchanged from v1 and the app's existing OKR thresholds
(`src/lib/date.ts → ACHIEVEMENT_LEVELS`, asserted by tests):

| Level | Score range | Color |
| --- | --- | --- |
| Legendary | 90%+ | `#eab308` |
| Elite | 75–89% | `#a855f7` |
| Advanced | 60–74% | `#3b82f6` |
| Intermediate | 40–59% | `#22c55e` |
| Beginner | 0–39% | `#9ca3af` |

Applied to the raw goal percentage, so overachievement maps to Legendary.
Level badges and changes appear on the summary and every habit card; the
legend lists the exact thresholds.

## 8. UI structure

`src/app/progress/_components/`:

- `habit-progress.tsx` — client shell: state (`view`, `cursor`), schedule
  timeline memo, period + row calculations, navigation, period banner
  (status/date detail + full-period comparison note), habit grid, and empty
  state.
- `progress-summary.tsx` — four overall cards: overall completion vs pooled
  target, achievement level, completed days (`out of 22.1 target days`), and
  change versus the previous period.
- `habit-progress-card.tsx` — per habit: current %, completed vs
  `formatTargetCount(target)` target days, category-colored progress bar,
  target label next to the category, the previous period block, change, and
  level movement.
- `progress-ui.tsx` — `LevelBadge`, `LevelChange`, `ProgressBar` (rendering
  capped at 100%, value text uncapped), `TrendValue`, formatters, and the
  `LevelLegend`.

Presentation notes (unchanged in spirit): Tailwind v4 + shadcn/ui, light/dark
aware, responsive `sm/lg/xl` grids, labelled progress bars, `aria-live` period
label, screen-reader-friendly loading text.

## 9. Loading, empty, and error states

- `loading.tsx` — route-level skeleton with `aria-busy` and
  "Loading habit progress…".
- Empty state — no habits → prompt with a "Go to the calendar" button.
- `error.tsx` — client error boundary (Next 16 `retry` prop) with "Try again"
  and a calendar link; the error is logged.

## 10. Files

Core:

- `prisma/schema.prisma` — `habits.weekly_target`, new `HabitSchedule` model.
- `prisma/migrations/20261025120000_habit_weekly_targets/` — DDL, CHECKs,
  FKs, RLS, backfill (see §3.3).
- `src/lib/habit-progress.ts` — pure target model:
  `sanitizeWeeklyTarget`, `buildScheduleTimelines`, `resolveWeeklyTarget`,
  `isHabitEligibleOn`, `getProgressPeriod`, `getPreviousProgressPeriod`,
  `computeHabitPeriodMetric`, `summarizeMetrics`, `compareMetrics`,
  `computeRangeRate` (calendar bar), `buildCompletionMap`,
  `formatTargetCount`.
- `src/app/actions/habit.actions.ts` — `getInitialData` (+schedules,
  `weeklyTarget`), transactional `addHabit`/`updateHabit` schedule writes,
  `/progress` revalidation for habit/completion mutations, strict
  `parseWeeklyTarget` validation.
- `src/lib/types.ts` — `Habit.weeklyTarget`, `getWeeklyTargetLabel()`.
- `src/stores/habit.store.ts` — targets flow through add/update.
- `src/app/_components/habit-form.tsx` — Weekly target select (add + edit).
- `src/app/progress/page.tsx` — passes schedules to the client shell.
- `src/app/progress/_components/*` — UI updates described in §8.
- `src/app/page.tsx` + `src/app/_components/calendar-grid.tsx` — home calendar
  state shell; the range bar lives in `calendar-progress-bar.tsx`, with
  range/date helpers in `calendar-utils.ts` (see §5.5).
- `scripts/habit-progress.test.mjs` — Node built-in test runner suite (see
  §12); no new dev dependencies.

From v1 (unchanged in role): `src/app/progress/{loading,error}.tsx`,
home-header Progress link, proxy protection, level legend/thresholds.

## 11. Worked examples

Current date: Oct 25, 2026 (a Sunday). Week = Oct 22–28.

1. **"5 days per week" habit, viewed Saturday Oct 24 (current week)**
   - Week Oct 22–28; today Oct 24.
   - Target = full week `5` (share `5/7` a day × 7).
   - 3 completions (Oct 22–24) → `3/5` = **60% → Advanced**; completed still
     counts only through Saturday.
   - Previous week (Oct 15–21) is taken at full length; if it also had target
     5, its goal is `5` too.

2. **Daily habit, same Saturday**
   - Target 7 → `3/7 ≈ 43% → Intermediate`. Identical denominators to v1's
     full-past-week case; only the access check (created before) gates it.

3. **Target change mid-week (5×/week since Oct 24, daily before)**
   - Days Oct 22–23 contribute share `1` each, Oct 24–28 contribute `5/7` →
     week target `2 + 25/7 ≈ 5.57`; historical days keep the old target.

4. **Monthly "5 days per week" across October (created Sep 1)**
   - Target `5/7 × 31 ≈ 22.1`; 10 completions → ≈ 45% toward the month goal.

5. **Created Oct 21, viewed monthly**
   - Eligible days Oct 21–31 = 11 → target `5/7 × 11 ≈ 7.9`; earlier dates are
     trimmed by the creation gate.

6. **Overachievement (completed week)**
   - Target 5, 7 completions → `140% → Legendary`; the bar renders at 100%,
     the label shows 140%.

7. **N/A rules**
   - Future week/month → target 0 → N/A everywhere (banner: "Not started").
   - Habit created after the viewed period or a zero target → N/A.
   - Comparisons N/A when either side has no target.

## 12. Validation performed

- **Committed test suite** `scripts/habit-progress.test.mjs`
  (`npm run test`, Node's built-in runner — no new dependencies): 26 tests
  covering month-anchored week buckets and navigation, schedule-history
  resolution, full-period weekly targets, daily habits, mid-week/mid-month
  target changes, monthly proportionality with
  creation trimming, overachievement >100%, future/zero-target N/A rules,
  previous-period semantics, comparison deltas, pooled summaries, target
  formatting, calendar range rates (weekly weighting, creation trimming,
  schedule replay, empty range), and unchanged level thresholds. All pass.
- **Migration validated locally** (Docker Postgres): applied over seeded
  habits/completions — `weekly_target` defaulted to 7, one schedule row per
  habit anchored at `DATE(created_at)`, CHECK constraint rejects out-of-range
  targets, four RLS policies present, `prisma migrate status` clean. Not yet
  applied to remote Supabase (user runs `npm run db:deploy` when ready).
- `npm run lint` — passes.
- `npx tsc --noEmit` — passes.
- `npm run build` (`prisma generate && next build`) — passes; `/progress`
  builds as a dynamic route.

## 13. Known limitations and future work

- **No weekday-specific scheduling:** the target model counts any day; a
  target of 5 accepts completion on any 7 share-allocated days rather than
  enforcing "Mon/Wed/Fri only". Adding specific weekdays would be a schedule
  model extension on top of `habit_schedules` (extra column + upsert path +
  form UI), deliberately out of scope for this round.
- **No archive state:** habits are deleted entirely (with completions and
  schedules). A soft "archived on" date would use the same eligibility
  predicate to stop shares after that date.
- **State in URL:** period selection remains client state; deep links
  (`?view=month&from=2026-09-01`) remain a natural enhancement.
- **Read scale:** the page still reads all of the user's completions via
  `getInitialData()` (matching analytics); windowing would be shared with
  analytics if ever needed.
- **Same-day edits collapse:** multiple target changes on one day upsert the
  single row for that day (unique constraint), keeping the last edit.
