-- Weekly habit targets and effective-dated schedule history:
-- CHECK constraints, auth.users foreign keys, RLS, and the backfill of safe
-- defaults for existing habits are not expressible in schema.prisma.
--
-- Safe defaults: every existing habit becomes a daily habit (target 1-7 scale,
-- 7 = every day), anchored to its creation date. Completion history is not
-- modified, and daily-habit progress calculations stay identical.

ALTER TABLE "habits"
  ADD COLUMN "weekly_target" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "habits"
  ADD CONSTRAINT "habits_weekly_target_check"
  CHECK ("weekly_target" BETWEEN 1 AND 7);

CREATE TABLE "habit_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "habit_id" UUID NOT NULL,
  "starts_on" DATE NOT NULL,
  "weekly_target" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "habit_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "habit_schedules_weekly_target_check"
    CHECK ("weekly_target" BETWEEN 1 AND 7)
);

CREATE UNIQUE INDEX "habit_schedules_habit_id_starts_on_key"
  ON "habit_schedules"("habit_id", "starts_on");
CREATE INDEX "idx_habit_schedules_user_id" ON "habit_schedules"("user_id");
CREATE INDEX "idx_habit_schedules_habit_id" ON "habit_schedules"("habit_id");

ALTER TABLE "habit_schedules"
  ADD CONSTRAINT "habit_schedules_habit_id_fkey"
  FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE;

ALTER TABLE "habit_schedules"
  ADD CONSTRAINT "habit_schedules_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Backfill: one initial schedule row per habit at its creation date (UTC
-- calendar day, matching the date-only keys used everywhere else).
INSERT INTO "habit_schedules" ("user_id", "habit_id", "starts_on", "weekly_target")
SELECT h."user_id", h."id", (h."created_at" AT TIME ZONE 'UTC')::DATE, 7
FROM "habits" h;

-- RLS policies: not expressible in schema.prisma. Mirrors the existing
-- habits/completions policy style.
ALTER TABLE "habit_schedules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit schedules"
  ON "habit_schedules" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own habit schedules"
  ON "habit_schedules" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own habit schedules"
  ON "habit_schedules" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own habit schedules"
  ON "habit_schedules" FOR DELETE USING (auth.uid() = "user_id");
