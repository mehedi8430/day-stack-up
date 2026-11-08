# DayStackUp — Docs

## Purpose

A full-stack daily habit tracker. Track progress from the Home dashboard and habit calendar, plan each day with time-blocked tasks, break habits down into milestones, attach notes and goals, and review trends in Analytics. Multi-user support with per-user data isolation (explicit `userId` scoping in every query, with Postgres Row Level Security as defense-in-depth).

## Complete Feature List

### 1. Authentication & Accounts
- **Email/password signup, login, and logout** via Supabase Auth (`/signup`, `/login`, logout in header)
- **Session endpoint** `/api/auth/session` for checking the current user
- **Protected routes** — `src/proxy.ts` middleware redirects unauthenticated visitors to `/login`; pages and layouts also enforce auth server-side
- **Auth layout redirect** — logged-in users visiting `/login` or `/signup` are sent back to `/`
- **Multi-user isolation** — RLS policies on every table guarantee each user only sees their own data

### 2. Home Progress Dashboard (`/`)
- **Weekly overview** — target-aware progress against the week's habit targets,
  completed target-days through today, and a level badge based on weekly
  progress; see [Home & Analytics Progress](./analytics-progress.md)
- **Daily check-ins** — toggle today's habits directly from the dashboard
- **Habit cards** — weekly target progress and achievement level for each habit
- **Quick links** — Calendar, Milestones, Plan tomorrow, and Analytics
- **Weekly achievement link** — opens the Milestones hub
- **Responsive navigation** — compact bottom navigation on mobile and full navigation on larger screens; the existing project typography is retained

### 3. Habit Calendar (`/calendar`)
- **Range grid view** — switch between Week (Saturday-to-Friday calendar weeks; every week covers exactly 7 days, weeks may span a month boundary, and the current week is the default), Month (calendar month), and Last 15 days (rolling window ending today); every view has previous/next navigation, Month has a "Today" jump, and Week has a "This week" jump; habits appear only from their creation date, and pre-creation dates cannot be checked; habits are rows and days are columns with sticky first/last columns
- **Range progress bar** — overall achievement for the elapsed part of the visible range, weighted by each habit's weekly target, trimmed to its creation date, and replayed across target changes; shows the percentage-point change versus the previous equivalent period and the achieved percentage (bars cap at 100%, labels may exceed it)
- **One-click completion toggle** per habit/day, rendered as category-colored `HabitCheckbox` cells
- **Drag-and-drop habit reordering** (dnd-kit) with a dedicated grip handle
- **Per-habit done counter** — shows completed days against the scheduled days for the visible range, proportionally weighted by each eligible date's effective weekly target and trimmed to the habit's creation date; historical ranges keep the target that was in effect then, and the counter turns green when completions cover the rounded scheduled count
- **Today highlighting** — today's column and header are visually highlighted
- **Responsive layout** — column widths adapt to mobile and desktop
- **Empty state** — friendly prompt to add the first habit when there are none

### 4. Habit Management (CRUD)
- **Add habit** with name, a color-coded **category** (Health, Mind, Work, Fitness, Other), an optional written **goal**, and a **weekly target** (*Every day* = 7, or 1–6 days per week for goals like "exercise 5 days a week")
- **Edit habit** — update name, category, goal, and weekly target from the calendar row; a target change is recorded in `habit_schedules` effective from the start of the current Saturday–Friday week, while earlier weeks retain their previous target
- **Delete habit** — confirmation dialog; deletes the habit and cascades its completion history and schedule rows

### 5. Habit Notes
- **Notes dialog** — open by clicking the habit name or from the habit row's three-dot menu
- View, add, and edit free-form notes per habit
- Notes are stored on the `habits` table (migrated from per-completion notes)

### 6. Milestones (per-habit sub-pages)
- **Milestone hub** (`/habits`) — responsive overview of habits showing the name, category, and goal; each entry links to its milestone manager
- **Per-habit milestone manager** (`/habits/[habitId]/milestones`):
  - Displays the habit's **goal** at the top (with a link to set it from the calendar if missing)
  - **Add / edit / delete milestones** with title, **start date**, **target date**, **details**, and **resources**
  - **Milestone statuses**: planned, in_progress, done, skipped (inline status select, color-coded badges)
  - **Drag-and-drop milestone reordering**
  - **Detail view dialog** — full read view of details and resources with an edit shortcut
  - Back navigation to the Home dashboard

### 7. Daily Planner (`/planner`)
- **Day-by-day navigation** — previous/next day arrows and a center button showing Today / Tomorrow / Yesterday / date
- **Quick-add task form** — title, **start time**, **duration** (minutes), **priority** (low / medium / high), and notes; press Enter to add quickly
- **Status workflow** — status button cycles planned → in_progress → done; plus **move to tomorrow** and **move to yesterday** actions that shift a task one day relative to its own date (move to yesterday is hidden on today's tasks)
- **Time-based task ordering** — scheduled tasks appear by start time, followed by unscheduled tasks
- **Edit task dialog** — update title, time, duration, priority, and notes
- **Delete task** — confirmation dialog before removal
- **Summary sidebar** — completed count (`X/Y`), remaining tasks (planned or in progress), and planned time (sum of task durations, shown as hours and minutes, e.g. `2 hrs 10 minutes`)
- Footer note reminding that time blocks are guidance
- **Weekly planner strip** — a collapsible strip for the Saturday-to-Friday
  week containing the selected date (always 7 days; weeks may cross a month
  boundary) opened from the "Weekly planner" button. Each day
  previews up to 3 of its tasks; selecting a day opens it below, and its
  "Add task" button selects that day and focuses the shared quick-add form.
  Includes week navigation (prev / next / this week)

### 8. Analytics Dashboard (`/analytics`)
- **View tabs** — Month / Week / Year, with year navigation arrows in year view
- **Summary cards**:
  - Completion % (weekly, monthly, or yearly) against eligible target-days
  - Achievement level badge for the selected period's completion rate
  - **30-day consistency** compared with the previous 30 days
  - Active habit count
  - **Time Worked chart** — hours from completed/in-progress planner task durations; per-day in Week view, per Saturday–Friday week in Month view (each bar counts only days within the selected month), or per-month in Year view; supports **Bar/Line view toggle** with Bar as default
  - **Monthly Completion chart** (year view) — monthly completion against each month's eligible target
  - **Per-Habit Completion bar chart** — color-coded by category, compared with each habit's eligible target
  - **Daily Score chart** — daily completions compared with eligible target shares; switch between Bar and Line views
  - **Streaks panel** — all-time current and best streaks per habit
  - **Habit Stability panel** — a habit selector displays one weekly
    completion sparkline at a time across up to 12 completed Saturday–Friday
    weeks, excluding the current and creation weeks
  - **Yearly Heatmap** (GitHub-style) — shown in Year view, with completion density against eligible target shares, tooltips and a less/more legend
  - **Target-aware summaries** — weekly, monthly, and yearly rates honor habit creation dates and effective-dated weekly targets, using the same calculations as the Home dashboard and calendar
  - **Month/Week navigation** — prev/next controls in Month and Week views to filter analytics data by any month or Saturday-to-Friday week
- Empty state when no habits exist yet
- Calculation details: [Home & Analytics Progress](./analytics-progress.md)

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
  - `habits` — id, user_id, name, category, sort_order, goal, notes
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
│   ├── calendar/    # Habit calendar and completion tracking
│   ├── actions/     # Server actions for habits, completions, planner & milestones
│   ├── _components/ # Shared components, including the Home dashboard
│   └── page.tsx     # Home progress dashboard
├── components/      # Shared UI (header, level badge, UI kit)
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