ALTER TABLE "focus_sessions"
    ADD COLUMN "pomodoro_enabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "pomodoro_phase" TEXT,
    ADD COLUMN "pomodoro_phase_ends_at" TIMESTAMPTZ(6),
    ADD COLUMN "pomodoro_remaining_seconds" INTEGER,
    ADD COLUMN "pomodoro_focus_minutes" INTEGER NOT NULL DEFAULT 25,
    ADD COLUMN "pomodoro_short_break_minutes" INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN "pomodoro_long_break_minutes" INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN "pomodoro_completed_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_pomodoro_phase_check"
    CHECK ("pomodoro_phase" IS NULL OR "pomodoro_phase" IN ('focus', 'short_break', 'long_break'));

ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_pomodoro_values_check"
    CHECK (
        "pomodoro_focus_minutes" BETWEEN 1 AND 120 AND
        "pomodoro_short_break_minutes" BETWEEN 1 AND 30 AND
        "pomodoro_long_break_minutes" BETWEEN 1 AND 60 AND
        "pomodoro_completed_count" >= 0 AND
        ("pomodoro_remaining_seconds" IS NULL OR "pomodoro_remaining_seconds" >= 0)
    );

ALTER TABLE "focus_sessions"
    ADD CONSTRAINT "focus_sessions_pomodoro_timer_check"
    CHECK (
        "pomodoro_phase_ends_at" IS NULL OR
        "pomodoro_remaining_seconds" IS NULL
    );
