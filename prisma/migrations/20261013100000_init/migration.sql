-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "habits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📋',
    "category" TEXT NOT NULL DEFAULT 'other',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "goal" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "habit_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_planner_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(6),
    "duration_minutes" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_planner_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "habit_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "details" TEXT NOT NULL DEFAULT '',
    "resources" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "target_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_topics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_habits_user_id" ON "habits"("user_id");

-- CreateIndex
CREATE INDEX "idx_habits_user_order" ON "habits"("user_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_completions_user_id" ON "completions"("user_id");

-- CreateIndex
CREATE INDEX "idx_completions_user_date" ON "completions"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_completions_habit_id" ON "completions"("habit_id");

-- CreateIndex
CREATE UNIQUE INDEX "completions_habit_id_date_key" ON "completions"("habit_id", "date");

-- CreateIndex
CREATE INDEX "idx_daily_planner_tasks_user_date" ON "daily_planner_tasks"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_habit_topics_habit_order" ON "habit_topics"("habit_id", "sort_order");

-- AddForeignKey
ALTER TABLE "completions" ADD CONSTRAINT "completions_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_topics" ADD CONSTRAINT "habit_topics_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

