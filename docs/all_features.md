# DayStackUp — Docs

## Purpose

A full-stack daily habit tracker. Track daily habits on a calendar, plan each day with time-blocked tasks in the planner, break habits down into milestones, attach notes and goals, and visualize progress through a full analytics dashboard. Multi-user support with secure data isolation via Postgres Row Level Security (RLS).

## Complete Feature List

### 1. Authentication & Accounts
- **Email/password signup, login, and logout** via Supabase Auth (`/signup`, `/login`, logout in header)
- **Session endpoint** `/api/auth/session` for checking the current user
- **Protected routes** — `src/proxy.ts` middleware redirects unauthenticated visitors to `/login`; pages and layouts also enforce auth server-side
- **Auth layout redirect** — logged-in users visiting `/login` or `/signup` are sent back to `/`
- **Multi-user isolation** — RLS policies on every table guarantee each user only sees their own data

### 2. Habit Calendar (home `/`)
- **Monthly grid view** — habits as rows, days as columns, with sticky first/last columns
- **One-click completion toggle** per habit/day, rendered as category-colored `HabitCheckbox` cells
- **Drag-and-drop habit reordering** (dnd-kit) with a dedicated grip handle
- **Month navigation** (previous / next) plus a "Today" button that jumps back to the current month
- **Per-habit done counter** — shows how many days in the visible month were completed (`X/days`)
- **Today highlighting** — today's column and header are visually highlighted
- **Responsive layout** — column widths adapt to mobile and desktop
- **Empty state** — friendly prompt to add the first habit when there are none

### 3. Habit Management (CRUD)
- **Add habit** with name, a color-coded **category** (Health, Mind, Work, Fitness, Other), and an optional written **goal**
- **Edit habit** — update name, category, and goal from the calendar row
- **Delete habit** — confirmation dialog; deletes the habit and cascades its completion history
- Default emoji `📋` for new habits

### 4. Habit Notes
- **Notes dialog** — open by clicking the habit's name in the calendar row
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
- **Week strip** — at the top of the daily planner, a 7-day (Mon–Sun) overview
  of the current week: each day shows a preview of its tasks, a per-day
  quick-add input, week navigation (prev / next / this week), and click-to-open
  any day in the planner below

### 7. Analytics Dashboard (`/analytics`)
- **View tabs** — Month / Week / Year, with year navigation arrows in year view
- **Summary cards**:
  - Completion % (monthly or yearly)
  - **Level badge** — Beginner → Intermediate → Advanced → Elite → Legendary based on average score
  - Active habit count
  - Best/current streak (🔥)
        - **Time Worked chart** — hours from completed/in-progress planner task durations; per-day, per-week (toggleable in month view), or per-month (year view); supports **Bar/Line view toggle** with Bar as default
       - **Monthly Completion chart** (year view) — % of habits completed in each month
       - **Per-Habit Completion bar chart** — color-coded by category
       - **Daily Score line chart** — % of habits completed each day
       - **Streaks panel** — current (🔥) and best (🏆) streak for every habit
       - **Yearly Heatmap** (GitHub-style) — completion density per day with tooltips and a less/more legend
       - **Month/Week navigation** — prev/next controls in Month and Week views to filter analytics data by any month or week
- Empty state when no habits exist yet

### 8. UI / UX
- **Dark & light mode toggle** — persisted in localStorage, respects system preference, with a flash-of-wrong-theme prevention script
- **Optimistic updates** — instant UI feedback with rollback on error (Zustand store)
- **Toast notifications** (Sonner) for success/error feedback
- **Tooltips** for dates and actions
- **shadcn/ui components** (Radix primitives) styled with Tailwind CSS v4
- Responsive, accessible dialogs, form validation, and aria labels throughout

### 9. Data Layer (Supabase migrations)
- `habits` — id, user_id, name, emoji, category, sort_order, goal, notes
- `completions` — id, user_id, habit_id, date, completed, timestamps; UNIQUE(habit_id, date)
- `daily_planner_tasks` — id, user_id, title, date, start_time, duration_minutes, priority, status, notes, position
- `habit_topics` (milestones) — id, user_id, habit_id, title, status, start_date, target_date, details, resources, sort_order
- **RLS enabled on all tables** with full CRUD policies scoped to `auth.uid()`
- Indexes on foreign keys and ordering columns
- Data-backfill migration that moved notes from `completions` to `habits`

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router), React 19 |
| Language | TypeScript |
| Database & Auth | Supabase (Postgres + RLS) |
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
│   ├── planner/     # Daily planner
│   ├── analytics/   # Analytics dashboard
│   ├── actions/     # Server actions for habits, completions, planner & milestones
│   └── ...          # Habit calendar (home), global layout
├── components/      # UI components (header, calendar, analytics, UI kit)
├── lib/             # Supabase clients, Zustand store, date helpers, types
└── proxy.ts         # Route protection middleware
supabase/
└── migrations/      # Database schema
```

## How It Works

1. User signs up/logs in → Supabase Auth handles sessions
2. Habits stored in `habits`, completions in `completions`, planner tasks in `daily_planner_tasks`, milestones in `habit_topics`
3. All mutations go through Server Actions → Supabase → revalidate cache
4. Zustand store holds client state with optimistic updates
5. Analytics computed from completion data using date-fns