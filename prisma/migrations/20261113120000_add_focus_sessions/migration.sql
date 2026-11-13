-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "segment_started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "accumulated_seconds" INTEGER NOT NULL DEFAULT 0,
    "reported_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_focus_sessions_user_id" ON "focus_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_focus_sessions_task_id" ON "focus_sessions"("task_id");

-- CreateIndex
CREATE INDEX "idx_focus_sessions_user_status" ON "focus_sessions"("user_id", "status");

-- AddForeignKey (Prisma relation)
ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "daily_planner_tasks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (Supabase auth, hand-written like the other tables)
ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
    ON DELETE CASCADE;

-- Hand-written constraints: Prisma cannot model CHECK constraints or
-- partial unique indexes.
ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_status_check"
    CHECK ("status" IN ('running', 'paused', 'completed'));

ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_seconds_check"
    CHECK ("accumulated_seconds" >= 0 AND "reported_seconds" >= 0);

ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_segment_check"
    CHECK (
        ("status" = 'running' AND "segment_started_at" IS NOT NULL) OR
        ("status" <> 'running' AND "segment_started_at" IS NULL)
    );

ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_ended_check"
    CHECK (("status" = 'completed') = ("ended_at" IS NOT NULL));

CREATE UNIQUE INDEX "focus_sessions_one_running_per_user"
    ON "focus_sessions" ("user_id") WHERE "status" = 'running';

CREATE UNIQUE INDEX "focus_sessions_one_open_per_task"
    ON "focus_sessions" ("task_id") WHERE "ended_at" IS NULL;

-- RLS: defense-in-depth. Runtime queries are explicitly scoped by user_id.
ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus sessions"
    ON "focus_sessions" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own focus sessions"
    ON "focus_sessions" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own focus sessions"
    ON "focus_sessions" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own focus sessions"
    ON "focus_sessions" FOR DELETE USING (auth.uid() = "user_id");
