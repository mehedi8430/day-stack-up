# AGENTS.md

## Purpose
This repository is a Next.js 16 daily habit tracker with Supabase-backed authentication, multi-user data isolation, a monthly habit calendar, planner, milestones, and analytics dashboard. Future AI agents working in this repo should treat it as a production-style app with user data and auth constraints, and should prefer minimal, careful changes that preserve existing architecture and UX patterns.

## Project summary
- Framework: Next.js 16 (App Router)
- UI: React 19 + TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui primitives
- Data/auth: Supabase Postgres + Auth + Row Level Security (RLS)
- State: Zustand for optimistic local state
- Charts: Recharts
- Drag/drop: dnd-kit
- Date utilities: date-fns

## Repository map
- `src/app/` — route-level pages, API endpoints, and server actions
  - `src/app/(auth)/` — login and signup UI
  - `src/app/actions/` — server actions for habits, completions, planner, and milestones
  - `src/app/api/auth/` — auth endpoints for login, logout, signup, and session
  - `src/app/habits/` — milestone hub and per-habit milestone management pages
  - `src/app/planner/` — daily planner screen and task UI
  - `src/app/analytics/` — analytics dashboard
  - `src/app/page.tsx` — main habit calendar landing page
- `src/components/` — shared UI like header, back button, and UI primitives
- `src/lib/` — shared types, date helpers, and Supabase client helpers
- `src/stores/store.ts` — Zustand state for habit/completion optimistic updates
- `src/proxy.ts` — route protection for authenticated pages
- `supabase/migrations/` — database schema and data migration history
- `docs/` — features and design notes, including product specs

## Core product behavior
- Habit data is scoped per user and enforced via Supabase RLS.
- The home page is the monthly habit calendar; task completion is driven by `habits` + `completions` rows.
- Planner and analytics read from their own tables and computed aggregates rather than a generic ORM layer.
- The daily planner stores concrete per-date tasks in `daily_planner_tasks`; the week strip on the planner page is a client-side grouping of those tasks by date.
- Notes are stored on the `habits` table, not on individual completion rows.
- Mood/behavior/analytics rely on server-side computed data, not ad hoc client-only logic.

## Important architecture patterns
### 1) Server actions are the data layer
Most mutating logic lives in `src/app/actions/*.ts` and is called from either server components or client code. Keep data changes there, not in component files.

Examples:
- `src/app/actions/habit.actions.ts` handles habits and completions.
- Keep `revalidatePath("/")` and other invalidation calls after successful mutation.
- Always check for authenticated user state and return a consistent `success`/`error` shape when appropriate.

### 2) Zustand is used for optimistic UI updates
`src/stores/store.ts` updates local state optimistically and rolls back on server error. When changing behavior tied to habits or completions:
- update the Zustand store if a UI action should feel instant
- preserve rollback logic on failure
- avoid duplicating queries or data derivation in multiple places

### 3) Protected routes are enforced via proxy and server-side auth checks
- `src/proxy.ts` protects `"/"` and `"/analytics"` for unauthenticated users.
- When adjusting auth or route behavior, keep the redirect pattern consistent.
- For server components, prefer `createClient()` from `src/lib/supabase/server.ts` and explicit user checks.

### 4) Database changes should be migration-first
If a feature requires a schema change:
- add or update the SQL migration in `supabase/migrations/`
- keep migration naming consistent with the existing timestamp naming convention
- prefer incremental changes with clear intent
- do not edit historical migration files casually unless there is a very specific reason

## Development commands
Run these from the project root:
- `npm install` — install dependencies
- `npm run dev` — start local Next.js dev server
- `npm run build` — production build
- `npm start` — run production build
- `npm run lint` — lint project with ESLint

No dedicated test suite is present right now; lint is the primary validation path unless a task introduces explicit tests.

## Coding conventions
- Prefer TypeScript types already defined in `src/lib/types.ts` and related modules.
- Keep components small and focused; route-specific UI should stay near the relevant page folder.
- Use existing shadcn/ui patterns instead of inventing new UI primitives when the repo already has them.
- Keep Tailwind class names consistent with the project’s current styling conventions.
- Avoid broad refactors unless directly related to the task.
- Prefer minimal, local edits over “cleanup” changes.

## Data and domain rules
- User isolation is mandatory. All table access should be scoped by `user_id` or equivalent auth checks.
- Completion rows are unique per habit/day; respect that model.
- Habit ordering uses `sort_order` and should be maintained consistently through reorder actions.
- Dates should use the existing local date helpers and ISO/date string conventions already used across the app.
- If you update a feature that affects analytics, verify the calendar, planner, and analytics views still fit the same assumptions.
- Analytics time worked supports bar/line toggle and month/week navigation; preserve mobile-friendly spacing when modifying charts.

## Agent workflow
When making changes, the agent should:
1. Read the relevant file(s) before patching.
2. Identify the exact root cause or required behavior.
3. Apply the smallest necessary fix.
4. Validate with the relevant project command, usually `npm run lint` for this repo.
5. Report what changed and what was verified.

## Safe change guidance
- Do not add placeholder code or fake data to production flows.
- Do not add test-only methods to production classes or files.
- Do not bypass auth or RLS assumptions unless the task explicitly requires a local-only prototype.
- Do not rewrite the app architecture for convenience; preserve the repository’s patterns.
- If a feature touches DB schema, update migrations and account for user-scoped behavior.

## Typical target files by concern
- Habit/calendar logic: `src/app/actions/habit.actions.ts`, `src/stores/store.ts`, `src/app/_components/calendar-grid.tsx`
- Planner logic: `src/app/planner/_components/*`, `src/app/actions/planner.actions.ts`
- Milestones: `src/app/habits/**`, `src/app/actions/milestone.actions.ts`
- Analytics: `src/app/analytics/**`
- Shared types: `src/lib/types.ts`
- Auth: `src/proxy.ts`, `src/app/api/auth/**`, `src/lib/supabase/server.ts`

## Quality bar for AI agents
Before finalizing a task, confirm:
- The change fits the existing Next.js + Supabase architecture.
- The behavior matches the intended user-facing feature.
- Auth and user scoping remain intact.
- The patch is minimal and does not introduce dead code.
- Relevant validation has been run and the evidence is included in the final update.

## One important note for future agents
This project already contains feature documentation and design notes in `docs/` and migration history in `supabase/migrations/`. Read those when a change touches product behavior or a prior design decision. Do not assume the current code is the only source of truth.
