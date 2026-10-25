# Habit Progress (`/progress`)

Status: implemented on branch `feat/habit-progress` (feature commit `93644e9`,
home-header link placement `b9bd1ac`).
Last updated: October 25, 2026.

## 1. Overview

Habit Progress is a read-only reporting page that shows how well each habit is
being kept for a selected week or month, compared with the directly preceding
period. It answers four questions for every habit:

1. What percentage of scheduled days were completed in the selected period?
2. How many days were completed versus how many were expected (`5/7`)?
3. Did performance improve, decline, or stay flat versus the previous period?
4. What achievement level does the habit hold, and did that level change?

The period selection, comparison math, level badges, and N/A rules are shared
between the weekly and monthly views, so both views behave identically.

## 2. Entry point and access

- The page lives at `/progress`.
- It is opened from the **home page header's right side** ("Progress" button,
  below the global navigation). It is intentionally **not** in the main
  navigation or the mobile menu.
- The route is protected in two places, consistent with the rest of the app:
  - `src/proxy.ts` redirects unauthenticated visits to `/login`.
  - `src/app/progress/page.tsx` also redirects when `getInitialData()` reports
    no authenticated user.
- The page is dynamic (server-rendered on demand) and read-only; all habit and
  completion mutations continue to live on the calendar.

## 3. Data reuse (no new schema or dependencies)

- Habits come from `prisma.habit.findMany({ where: { userId } })` and
  completions from `prisma.completion.findMany({ where: { userId } })` via the
  existing `getInitialData()` server action. Every read is scoped to the
  authenticated user; there are no new tables, columns, or packages.
- Completion rows are unique per habit/day in Postgres
  (`completions_habit_id_date_key`), and rows with `completed = false` are
  dropped when building the client-side lookup. Duplicated completions can
  never inflate a count.
- The completion lookup uses the existing `habitId__yyyy-mm-dd` key format, so
  it matches what the Zustand store and calendar already use.

## 4. Period model

`getProgressPeriod(view, cursor, today)` in `src/lib/habit-progress.ts`
describes the period being viewed. Weeks run **Monday–Sunday**
(`startOfWeek(..., { weekStartsOn: 1 })`); months are calendar months.

| Field | Meaning |
| --- | --- |
| `view` | `"week"` or `"month"` |
| `start` | First calendar day of the period |
| `end` | Last calendar day of the period, including future days |
| `effectiveEnd` | Last day included in calculations (`today` for the current period) |
| `totalDays` | Calendar length of the whole period (7, or 28–31) |
| `elapsedDays` | Days actually included in calculations; `0` for a future period |
| `isCurrent` | `today` falls inside the period |
| `isFuture` | The period starts after today |

Navigation behavior:

- Previous/next step one week or one month at a time.
- Forward navigation is disabled once the selected period is the current one,
  so future periods cannot be opened.
- "This week" / "This month" appears when viewing an earlier period and resets
  to the current one.
- The period label is `Oct 19 – Oct 25, 2026` (weeks) or `MMMM yyyy` (months)
  and is announced through `aria-live`.

## 5. Expected-day (eligibility) rules

A date is **eligible** for a habit when:

1. It falls inside the period's calculated range
   (`start ≤ date ≤ effectiveEnd`), and
2. The habit was already active on that date.

### Schedule model (current limitation, handled explicitly)

The current `habits` table has **no frequency, schedule, or archive columns**;
the only lifecycle boundary is `createdAt`, and deleting a habit removes it and
its completions (cascade). The implementation therefore treats every habit as
scheduled **daily from its creation date onward**, per the existing data
model:

```ts
// src/lib/habit-progress.ts
export function isHabitScheduledOn(habit, date) {
  const createdOn = habit.createdAt.slice(0, 10);   // date-only key
  if (!/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) return true;
  return toKey(date) >= createdOn;
}
```

- `createdAt` is compared as a **date-only string**, not as a local `Date`.
  This keeps server and browser renders identical regardless of timezone and
  matches how completion date keys are produced.
- Dates before `createdAt` are excluded from both the numerator and the
  denominator.
- Because schedule history does not exist in the schema, historical results are
  exact only under the daily model. If a frequency or archive field is added
  later, `isHabitScheduledOn()` is the single predicate to extend, and
  effective-dated schedule storage would be needed for exact historical
  recalculations. This limitation is documented rather than hidden.

### Core formulas

```
expected  = number of eligible scheduled dates in the period
completed = number of eligible scheduled dates with a completion
percentage   = expected === 0 ? N/A : (completed / expected) × 100
```

- If `expected == 0`, the percentage, level, and any comparison against the
  period are reported as **N/A**, never `0%`.
- Percentages and per-habit counts are computed per date, not from aggregates,
  so nothing depends on a habit's total history only existing "now".

## 6. Comparison with the previous period

`getPreviousProgressPeriod(current)` produces the comparison period:

- **Week:** the immediately preceding Monday–Sunday week.
- **Month:** the immediately preceding calendar month.
- **In-progress current period:** the previous period is clipped to the *same
  number of elapsed calendar days*. A month on day 25 is compared with the
  first 25 days of the previous month; a week on Wednesday is compared with the
  previous Monday–Wednesday.
- **Completed historical period:** the full previous period is used.
- If the previous month is shorter than the current elapsed span (March 30/31
  versus February), the previous period is clamped to its real length and the
  UI notes that all of its days were used. Percentages remain the fair basis
  for the comparison; completed-day deltas are always shown with both periods'
  `completed/expected` values so the different lengths stay visible.

Per-habit and overall comparisons then derive (`compareMetrics`):

| Metric | Rule |
| --- | --- |
| `percentageDelta` | `current.percentage − previous.percentage`; `N/A` when either side has no eligible days |
| `completedDelta` | `current.completed − previous.completed`; `N/A` when either `expected` is `0` |
| `trend` | `↑` when the percentage improves, `↓` when it declines, `→` when unchanged; `N/A` when undeducible |
| `completedTrend` | Same logic applied to the completed-day delta |
| `levelTrend` | Compares achievement levels by rank; `↑` improved, `↓` declined, `→` unchanged, `N/A` when either level is missing |

Display rules:

- Percentages render rounded to the nearest whole number.
- Percentage-point changes show one decimal (e.g. `+14.3 pts`) so small real
  changes are not lost by whole-number rounding; direction is derived from the
  same one-decimal value, so the arrow and the shown number always agree.
- Completed-day changes show signed whole days (`+2 days`, `-1 day`, `0 days`).
- The current period is labelled **In progress** with
  `Day X of Y included · future dates excluded`; historical periods are
  labelled **Complete period**.
- The eligibility rules (`isHabitScheduledOn`) are applied identically in both
  periods, so a habit created mid-way is compared fairly:
  e.g. created Oct 20 of the current week (19–25) → expected = 6, and the
  previous week's expected value is `0`, which renders the comparison as `N/A`.

## 7. Achievement levels

Levels reuse the **existing** OKR thresholds from `src/lib/date.ts`; nothing
new was invented. `getLevel()` was refactored onto a single `ACHIEVEMENT_LEVELS`
table that adds `minScore` and `rank` (used for the legend and level-change
comparison) without changing any threshold or color:

| Level | Score range | Color |
| --- | --- | --- |
| Legendary | 90%+ | `#eab308` |
| Elite | 75–89% | `#a855f7` |
| Advanced | 60–74% | `#3b82f6` |
| Intermediate | 40–59% | `#22c55e` |
| Beginner | 0–39% | `#9ca3af` |

- Levels and level changes appear both on the overall summary and on every
  habit card ("Level: ↑ Improved (was Intermediate)" etc.).
- A legend under the habit list displays the exact thresholds.

## 8. UI structure

`src/app/progress/_components/`:

- `habit-progress.tsx` — client shell: state (`view`, `cursor`), period + row
  calculations, navigation, period banner, and the habit grid/empty state.
- `progress-summary.tsx` — four overall cards: completion %, achievement
  level, completed days, and change versus the previous period (plus a note
  that in-progress comparisons use the equivalent elapsed span).
- `habit-progress-card.tsx` — one card per habit: current %, `completed of
  expected scheduled days`, category-colored progress bar, previous period
  (`Previous week (same span)` when clipped), change, and level movement.
- `progress-ui.tsx` — shared primitives: `LevelBadge`, `LevelChange`,
  `ProgressBar`, `TrendValue`, percentage/day formatters, and `LevelLegend`.

Presentation notes:

- Identical to the rest of the app: Tailwind v4 + shadcn/ui cards, buttons, and
  tabs, light/dark aware colors, `text-emerald/red` trend colors, and
  `sm:`/`lg:`/`xl:` responsive grids (4-up summary on large screens, 1-up
  habit cards on mobile, 2-up on `lg`+).
- Accessibility: labelled progress bars (`role="progressbar"` with
  `aria-valuenow` or `N/A` text), `aria-live` period label, meaningful
  `aria-label`s on the previous/next controls, and `sr-only` loading text.

## 9. Loading, empty, and error states

- `loading.tsx` — route-level skeleton matching the page layout, with
  `aria-busy` and a screen-reader-friendly "Loading habit progress…" message.
- Empty state — when the user has no habits, the page shows the title plus a
  prompt with a "Go to the calendar" button.
- `error.tsx` — client error boundary (Next 16 `retry` prop) with "Try again"
  and a link back to the calendar; the error is logged to the console.

## 10. Files

New:

- `src/lib/habit-progress.ts` — pure period/eligibility/comparison logic
  (`getProgressPeriod`, `getPreviousProgressPeriod`,
  `isHabitScheduledOn`, `computeHabitPeriodMetric`, `summarizeMetrics`,
  `compareMetrics`, `buildCompletionMap`).
- `src/app/progress/page.tsx`
- `src/app/progress/loading.tsx`
- `src/app/progress/error.tsx`
- `src/app/progress/_components/habit-progress.tsx`
- `src/app/progress/_components/progress-summary.tsx`
- `src/app/progress/_components/habit-progress-card.tsx`
- `src/app/progress/_components/progress-ui.tsx`

Modified:

- `src/lib/date.ts` — `getLevel()` refactored onto `ACHIEVEMENT_LEVELS`
  (same thresholds, colors, and labels; adds `minScore` and `rank`).
- `src/app/_components/home-greeting.tsx` — adds the home-header Progress link.
- `src/components/app-header.tsx` — Progress intentionally **not** in the nav.
- `src/proxy.ts` — protects `/progress`.
- `eslint.config.mjs` — ignores the generated `.next-root-owned-cache` folder
  so `npm run lint` validates source rather than build artifacts.
- `docs/all_features.md`, `README.md` — feature list and structure entries.

## 11. Worked examples

Current date: Oct 25, 2026 (a Sunday).

1. **Current week viewed on Thursday (Oct 22)**
   - Period: Mon Oct 19 – Sun Oct 25, marked *In progress* (day 4 of 7).
   - Daily habit created Oct 1 → expected = Oct 19–22 = `4` days.
   - 2 completions → `2/4` = **50%**, and the previous period is
     Mon Oct 12 – Wed Oct 15 (the equivalent 4 days), not the full previous
     week.

2. **Current week viewed on Sunday (Oct 25)**
   - Period: Oct 19 – Oct 25 (7 of 7 days included) → the previous comparison
     week is the full Oct 12–18.

3. **Current month on Oct 15**
   - Current range: Oct 1–15 (15 eligible days), previous range:
     Sep 1–15 — *not* the full 30-day September.

4. **Short previous month**
   - Viewing March with today Mar 31: current = Mar 1–31, previous is clamped
     to Feb 1–28, and the UI notes the shorter previous month.

5. **Zero eligible days**
   - Habit created Nov 1 viewed against an October month → `expected = 0`,
     `50 → N/A`, level `N/A`, comparisons `N/A` — never a misleading `0%`.

## 12. Validation performed

- `npm run lint` — passes (after adding the generated-cache ignore).
- `npx tsc --noEmit` — passes.
- `npm run build` (`prisma generate && next build`) — passes; `/progress`
  appears as a dynamic route in the build output.
- A throwaway assertion script (not committed) exercised the pure functions:
  Monday week boundaries, full/part comparisons, previous-month clipping,
  short-month clamping, mid-period creation, duplicate/junk completions,
  zero-eligible N/A, pooled summaries, trend direction, and unchanged level
  thresholds. All assertions passed.
- The repo has no committed test suite; lint, type checking, and build are the
  project's standard validation path (`AGENTS.md`).

## 13. Known limitations and future work

- **Schedule history:** the schema stores no frequency or schedule changes, so
  only the daily-from-creation model exists. Adding frequency/weekly targets or
  archive dates requires extending `isHabitScheduledOn()` and persisting
  effective-dated schedules to keep historical comparisons exact.
- **Deactivated habits:** there is no "archived" state; habits are deleted
  entirely (with completions). If a soft-deactivate state is added, the same
  lifecycle predicate should exclude post-archived dates.
- **State in URL:** period selection is client state; deep links to a specific
  week/month (e.g. `?view=month&from=2026-09-01`) would be a natural future
  enhancement if sharing a view is needed.
- The progress page reads all of the user's completion rows once via
  `getInitialData()`, matching the existing analytics pattern; if completions
  grow large the same pagination/windowing strategy that analytics would need
  can be introduced there and reused.
