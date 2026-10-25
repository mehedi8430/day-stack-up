# DayStackUp

A modern productivity habit tracker built with **Next.js**, **Prisma**, and **Supabase**. Stack your day, build streaks, track habits on a monthly calendar, plan your day with the planner, and measure progress with a full analytics dashboard — with multi-user support out of the box.

[![Live Demo](https://daystackup.vercel.app/)](https://daystackup.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://www.prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_&_Auth-3fcf8e)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)](https://tailwindcss.com)

## Features

- **Email & password authentication** — sign up, log in, and log out, with protected routes that redirect unauthenticated visitors to the login page.
- **Multi-user by design** — every query is scoped to the signed-in user, and Postgres Row Level Security is enabled on all tables as defense-in-depth.
- **Calendar grid** — month view with one-click completion toggles for every habit, plus a per-month done counter.
- **Habit categories & goals** — tag each habit with a color-coded category (Health, Mind, Work, Fitness, Other) and a written goal.
- **Drag-and-drop ordering** — rearrange habits into the order that works for you.
- **Habit notes** — click any habit's name to attach free-form notes.
- **Milestones** — break each habit into tracked milestones with start/target dates, details, resources, and progress statuses.
- **Daily planner** — plan each day with time-blocked tasks (start time, duration, priority, notes, and a planned → in-progress → done → skipped workflow), plus a weekly strip (Saturday-start) for a whole-week overview.
- **Analytics dashboard** — completion rates, per-habit and daily-score charts, time worked from planner tasks, current and best streaks, and a GitHub-style yearly heatmap.
- **Habit progress** — weekly (Monday–Sunday) and monthly completion per habit, with level badges, previous-period comparisons, and fair in-progress calculations.
- **Dark & light mode** — switch themes from the header.

## Tech Stack

| Layer           | Technology                         |
| --------------- | ---------------------------------- |
| Framework       | Next.js 16 (App Router) · React 19 |
| Language        | TypeScript                         |
| Database & Auth | Supabase (Postgres + Auth)         |
| Data access     | Prisma Client + `@prisma/adapter-pg` |
| Schema & migrations | Prisma (`prisma/schema.prisma`) |
| Client state    | Zustand                            |
| Styling         | Tailwind CSS v4                    |
| UI components   | shadcn/ui (Radix primitives)       |
| Charts          | Recharts                           |
| Drag & drop     | dnd-kit                            |
| Dates           | date-fns                           |

## Getting Started

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) account

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Set up the database schema: the schema and RLS migrations live in `prisma/migrations/`. Put the Supabase Postgres connection string in `SUPABASE_DATABASE_URL` in `.env`, then apply the migrations with `npm run db:deploy`. The Prisma CLI reads `.env` via `dotenv/config` (it does **not** read `.env.local`). Prisma uses `DATABASE_URL` when set and falls back to `SUPABASE_DATABASE_URL`; locally, `DATABASE_URL` points at Docker Postgres. For production, configure `SUPABASE_DATABASE_URL` as a deployment secret and set `LOCAL_AUTH_BOOTSTRAP=0` (or leave it unset).
   - Use the **Session Pooler** connection string (Supabase → **Connect → Session pooler**, host `aws-0-[region].pooler.supabase.com`). Supabase's direct host (`db.[project-ref].supabase.co`) is **IPv6-only**, so it fails with `P1001: Can't reach database server` on IPv4-only networks.
   - If the database **already has these tables** (e.g. migrated from the old `supabase/migrations`), do not re-run the create migrations. Baseline the existing history once instead, then deploy:
     ```bash
     for m in 20261013090000_auth_bootstrap 20261013100000_init 20261013110000_constraints 20261013120000_rls; do
       npx prisma migrate resolve --applied "$m"
     done
     npm run db:deploy
     ```
     This only records the migrations as applied; it does not run their SQL or touch existing data.
3. Under **Authentication → Providers**, enable **Email/Password**.
4. From **Project Settings → API**, copy your project URL, anon key, and service role key.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable                        | Description                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-side service role key                                                         |
| `DATABASE_URL`                  | Postgres connection string; takes precedence when set (local Docker Postgres in dev) |
| `SUPABASE_DATABASE_URL`         | Supabase Postgres string (prefer the Session Pooler IPv4 host); used when `DATABASE_URL` is not set |
| `LOCAL_AUTH_BOOTSTRAP`          | Set to `1` only for local Docker Postgres; set to `0` or leave unset in production   |

### 3. Install and Run

The app reads and writes through the Prisma Client, which is generated from `prisma/schema.prisma`. Start the local Postgres (Docker), generate the client, apply the migrations, then run the dev server:

```bash
npm install
docker compose up -d db   # local Postgres 16 on :5432
npx prisma generate       # build the Prisma Client used by the server actions
npm run db:deploy         # apply migrations to the local database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`. Create an account via **Sign up**, add your first habit, and start tracking. For local auth to work against the Docker database, keep `LOCAL_AUTH_BOOTSTRAP=1` in `.env` so the signed-in Supabase user is mirrored into the local `auth.users` stub (the `user_id` foreign keys depend on it).

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login and signup pages
│   ├── api/auth/        # Signup, login, logout, session endpoints
│   ├── habits/          # Milestone hub and per-habit milestone manager
│   ├── planner/         # Weekly planner (Saturday-start week strip + day view)
│   ├── analytics/       # Analytics dashboard
│   ├── progress/        # Weekly/monthly habit progress and period comparison
│   ├── actions/         # Server actions for habits, completions, planner & milestones
│   └── page.tsx         # Habit calendar (home)
├── components/          # Shared UI (header, back button, UI kit)
├── lib/                 # Prisma + Supabase clients, date helpers, types
└── stores/              # Zustand store (optimistic habit/completion state)
prisma/
├── schema.prisma        # Schema source of truth
└── migrations/          # Migration history (tables, constraints, RLS)
```

## Available Scripts

| Command               | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Start the development server                                 |
| `npm run build`       | Generate the Prisma client and create a production build (`prisma generate && next build`) |
| `npm start`           | Serve the production build                                   |
| `npm run lint`        | Run ESLint                                                   |
| `npm run db:migrate`  | Create/apply a migration in local dev (`prisma migrate dev`) |
| `npm run db:deploy`   | Apply pending migrations (`prisma migrate deploy`)           |
| `npm run db:status`   | Show migration status (`prisma migrate status`)              |
| `npm run db:studio`   | Open Prisma Studio (`prisma studio`)                         |
| `npm run db:validate` | Validate `prisma/schema.prisma`                              |

The production build runs `prisma generate` first, so the generated client exists on a fresh install (such as Vercel) before Next.js compiles.
