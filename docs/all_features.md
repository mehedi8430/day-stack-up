# DayStackUp — Docs

## Purpose

A full-stack daily habit tracker. Track daily habits on a calendar, plan each day with time-blocked tasks in the planner, break habits down into milestones, attach notes and goals, and visualize progress through a full analytics dashboard. Multi-user support with per-user data isolation (explicit `userId` scoping in every query, with Postgres Row Level Security as defense-in-depth).

## Complete Feature List

### 1. Authentication & Accounts
- **Email/password signup, login, and logout** via Supabase Auth (`/signup`, `/login`, logout in header)
- **Session endpoint** `/api/auth/session` for checking the current user
- **Protected routes** — `src/proxy.ts` middleware redirects unauthenticated visitors to `/login`; pages and layouts also enforce auth server-side
- **Auth layout redirect** — logged-in users visiting `/login` or `/signup` are sent back to `/`
- **Multi-user isolation** — RLS policies on every table guarantee each user only sees their own data

### 2. Habit Calendar (home `/`)
- **Range grid view** — switch between Week (Saturday-to-Friday calendar weeks; every week covers exactly 7 days, weeks may span a month boundary, and the current week is the default), Month (calendar month), and Last 15 days (rolling window ending today); every view has previous/next navigation, Month has a "Today" jump, and Week has a "This week" jump; habits are rows and days are columns with sticky first/last columns
- **Range progress bar** — overall achievement for the elapsed part of the visible range, weighted by each habit's weekly target, trimmed to its creation date, and replayed across target changes; shows the percentage-point change versus the previous equivalent period and the achieved percentage (bars cap at 100%, labels may exceed it)
- **One-click completion toggle** per habit/day, rendered as category-colored `HabitCheckbox` cells
- **Drag-and-drop habit reordering** (dnd-kit) with a dedicated grip handle
- **Per-habit done counter** — shows completed days against the habit's current scheduled days for the visible range: every view pins the habit's current weekly target (week view uses the exact target; month and last-15 views use the target's share of the eligible days, rounded to whole days, e.g. 5 days/week across a 31-day month → `22.14` → `22`), so a mid-period target change never blends old and new targets into the denominator; trimmed to the habit's creation date; turns green when completions cover that scheduled count
- **Today highlighting** — today's column and header are visually highlighted
- **Responsive layout** — column widths adapt to mobile and desktop
- **Empty state** — friendly prompt to add the first habit when there are none

### 3. Habit Management (CRUD)
- **Add habit** with name, a color-coded **category** (Health, Mind, Work, Fitness, Other), an optional written **goal**, and a **weekly target** (*Every day* = 7, or 1–6 days per week for goals like "exercise 5 days a week")
- **Edit habit** — update name, category, goal, and weekly target from the calendar row; changing the target is recorded in `habit_schedules` effective today so historical progress keeps the previous target
- **Delete habit** — confirmation dialog; deletes the habit and cascades its completion history and schedule rows
- Default emoji `📋` for new habits

### 4. Habit Notes
- **Notes dialog** — open from the habit row's three-dot menu
- View, add, and edit free-form notes per habit
- Notes are stored on the `habits` table (migrated from per-completion notes)

### 5. Milestones (per-habit sub-pages)
- **Milestone hub** (`/habits`) — grid of habit cards showing the emoji, category color dot, category badge, and goal preview; each card links to its milestone manager
- **Per-habit milestone manager** (`/habits/[habitId]/milestones`):
  - Displays the habit's **goal** at the top (with a link to set it from the calendar if missing)
  - **Add / edit / delete milestones** with title, **start date**, **target date**, **details**, and **resources**
  - **Milestone statuses**: planned, in_progress, done, skipped (inline status select, color-coded badges)
  - **Drag-and-drop milestone reordering**
  - **Detail view dialog** — full read view of details and resources with an edit shortcut
  - Back to calendar button

### 6. Daily Planner (`/planner`)
- **Day-by-day navigation** — previous/next day arrows and a center button showing Today / Tomorrow / Yesterday / date
- **Quick-add task form** — title, **start time**, **duration** (minutes), **priority** (low / medium / high), and notes; press Enter to add quickly
- **Status workflow** — status button cycles planned → in_progress → done; plus dedicated **skip** and **move to tomorrow** actions
- **Drag-and-drop task reordering**; tasks sorted by start time then position
- **Edit task dialog** — update title, time, duration, priority, and notes
- **Delete task** — confirmation dialog before removal
- **Summary sidebar** — completed count (`X/Y`), remaining tasks (planned or in progress), and planned time (sum of task durations)
- Footer note reminding that time blocks are guidance
- **Weekly planner strip** — a collapsible strip for the Saturday-to-Friday
  week containing the selected date (always 7 days; weeks may cross a month
  boundary) opened from the "Weekly planner" button. Each day
  previews up to 3 of its tasks, has a per-day quick-add input, and can be
  clicked to open that day below; includes week navigation (prev / next / this
  week)

### 7. Analytics Dashboard (`/analytics`)
- **View tabs** — Month / Week / Year, with year navigation arrows in year view
- **Summary cards**:
  - Completion % (weekly, monthly, or yearly) against eligible target-days
  - **Level badge** — Beginner → Intermediate → Advanced → Elite → Legendary based on target progress
  - Active habit count
  - Best/current streak (🔥)
  - **Time Worked chart** — hours from completed/in-progress planner task durations; per-day, per-week (Saturday-start weeks that overlap the month, each bar counting only the month's days in its week, toggleable in month view), or per-month (year view); supports **Bar/Line view toggle** with Bar as default
  - **Monthly Completion chart** (year view) — monthly completion against each month's eligible target
  - **Per-Habit Completion bar chart** — color-coded by category, compared with each habit's eligible target
  - **Daily Score line chart** — daily completions compared with eligible target shares
  - **Streaks panel** — all-time current and best streaks per habit, plus an overall target-aware 30-day consistency rate with trend
  - **Habit Stability panel** — a habit selector displays one weekly
    completion sparkline at a time, defaulting to the first habit, across
    up to 12 completed Saturday–Friday weeks (excluding the current and
    partial creation weeks). Stability labels use standard deviation:
    High (≤1.25), Moderate (≤2.25), and Low (>2.25) completions per week;
    new habits are marked Building and zero-activity habits are called out
    separately.
  - **Yearly Heatmap** (GitHub-style) — completion density against eligible target shares, with tooltips and a less/more legend
  - **Target-aware summaries** — weekly, monthly, and yearly rates honor habit creation dates and effective-dated weekly targets, matching `/progress`
  - **Month/Week navigation** — prev/next controls in Month and Week views to filter analytics data by any month or Saturday-to-Friday week
- Empty state when no habits exist yet

### 8. Habit Progress (`/progress`)
- **Week / Month reporting periods** — weeks are **Saturday-to-Friday** calendar weeks (every week covers exactly 7 days and may cross a month boundary); previous/next navigation moves one week or month at a time, and forward navigation stops at the current period
- **Direct habit view** — clicking a habit name in the calendar opens `/progress?habit=<id>`, with the summary and cards scoped to that habit and a link back to all habits
- **Weekly targets** — every habit targets N days per week (1–7; `Every day` = 7 default); existing habits migrated to daily without data loss
- **Overall summary** — completion %, completed vs pooled period target, achievement level, and change compared with the previous period
- **Per-habit breakdown** — completion %, completed/target days, progress bar, current and previous level badges, percentage-point change, completed-day change, and ↑ / ↓ / → trend indicators
- **Target-based math** — weekly progress is `completed occurrences / weekly target × 100`; monthly targets are proportional (`weeklyTarget/7 × eligible days`, trimmed by the habit's creation date and replayed across target changes via `habit_schedules` history)
- **Full-period goal view** — current periods always show progress against the full-period target (a full week shows the whole weekly target, and a month shows its proportional target), so users can see how far they are toward the goal; comparisons use full-period goals on both sides (documented on the page)
- **Overachievement** — percentages can exceed 100% (e.g. 7 completions for a 5-days/week target = 140%); progress bars fill at most to 100% while labels show the real value
- **Level badges** — reuse the existing `getLevel` thresholds (Beginner <40%, Intermediate 40–59%, Advanced 60–74%, Elite 75–89%, Legendary 90%+) and show whether each habit's level improved, declined, or stayed the same; overachievement maps to Legendary
- **N/A handling** — future periods, habit-not-yet-created ranges, and zero targets show `N/A` instead of `0%`
- **Data flow** — reads habits, completions, and schedule rows through `getInitialData` (all user-scoped); `habit_schedules` is the one new table, added with RLS/CHECK constraints and a backfill for existing habits (`docs/habit-progress.md` §3); migration validated locally, application to the remote database pending (`npm run db:deploy`)
- **Loading, empty, and error states** — route-level branded loader, no-habits prompt, and retryable error boundary
- **Tests** — `npm run test` runs `scripts/habit-progress.test.mjs` (Node's built-in runner) covering targets, schedules history, proportionality, overachievement, N/A rules, and unchanged level thresholds
- Full behavior, formulas, worked examples, and file map: `docs/habit-progress.md`

### 9. UI / UX
- **Dark & light mode toggle** — persisted in localStorage, respects system preference, with a flash-of-wrong-theme prevention script
- **Optimistic updates** — instant UI feedback with rollback on error (Zustand store)
- **Toast notifications** (Sonner) for success/error feedback
- **Tooltips** for dates and actions
- **shadcn/ui components** (Radix primitives) styled with Tailwind CSS v4
- Responsive, accessible dialogs, form validation, and aria labels throughout

### 10. Data Layer (Prisma schema + migrations)
- **Schema source of truth** — `prisma/schema.prisma`; migration history lives in `prisma/migrations/` (the old `supabase/migrations/` was removed)
- **Runtime data access** — the **Prisma Client** (`@prisma/client` with the `@prisma/adapter-pg` driver adapter) is used inside the server actions and `src/lib/auth.ts`. Supabase is used only for authentication.
- Tables:
  - `habits` — id, user_id, name, emoji, category, sort_order, goal, notes
  - `completions` — id, user_id, habit_id, date, completed, timestamps; UNIQUE(habit_id, date)
  - `daily_planner_tasks` — id, user_id, title, date, start_time, duration_minutes, priority, status, notes, position
  - `habit_topics` (milestones) — id, user_id, habit_id, title, status, start_date, target_date, details, resources, sort_order
- **RLS enabled on all tables** with full CRUD policies scoped to `auth.uid()`, shipped as guarded raw SQL in the migration set (Prisma cannot model RLS or CHECK constraints)
- **CHECK constraints** on `priority`, `status`, and `duration_minutes` (`status`/`priority` stay `String` columns, not Prisma enums)
- `user_id` foreign keys reference `auth.users(id) ON DELETE CASCADE` (Supabase-managed `auth` schema; stubbed locally for Docker Postgres)
- Indexes on foreign keys and ordering columns
- Because the app connects through a privileged database role, **runtime user isolation is enforced by explicit `userId` filters in every Prisma query**; the RLS policies remain in place as defense-in-depth

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router), React 19 |
| Language | TypeScript |
| Database & Auth | Supabase (Postgres + Auth) |
| Data access | Prisma Client (`@prisma/client` + `@prisma/adapter-pg`) |
| Schema & migrations | Prisma (`prisma/schema.prisma`, `prisma/migrations/`) |
| State | Zustand |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Dates | date-fns |

## Project Structure

```
src/
├── app/             # Pages, API routes, server actions
│   ├── (auth)/      # Login and signup pages
│   ├── api/auth/    # Signup, login, logout, session endpoints
│   ├── habits/      # Milestone hub and per-habit milestone manager
│   ├── planner/     # Weekly planner (week strip + day view)
│   ├── analytics/   # Analytics dashboard
│   ├── progress/    # Weekly/monthly habit progress and period comparison
│   ├── actions/     # Server actions for habits, completions, planner & milestones
│   └── ...          # Habit calendar (home), global layout
├── components/      # UI components (header, UI kit)
├── lib/             # Prisma + Supabase clients, date helpers, types
├── stores/          # Zustand store (habit.store.ts)
└── proxy.ts         # Route protection middleware
prisma/
├── schema.prisma    # Schema source of truth
└── migrations/      # Migration history (tables, constraints, RLS)
```

## How It Works

1. User signs up/logs in → **Supabase Auth** handles sessions; protected routes redirect to `/login`
2. Data is read and written through server actions using the **Prisma Client**, always scoped by `userId`
3. Habits are stored in `habits`, completions in `completions`, planner tasks in `daily_planner_tasks`, milestones in `habit_topics`
4. Mutations go Server Action → Prisma Client → Postgres, then `revalidatePath` refreshes the cache
5. The Zustand store holds client state with optimistic updates and rolls back on error
6. Analytics are computed server-side from completion and planner data using date-fns

## Build & Deploy

- `npm run build` runs `prisma generate && next build`, so the generated Prisma Client exists on a fresh install (e.g. Vercel) before Next.js compiles.
- Schema changes are applied to Supabase with `npm run db:deploy` (Prisma reads `SUPABASE_DATABASE_URL` when `DATABASE_URL` is unset).