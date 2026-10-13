-- CHECK constraints and auth.users foreign keys: not expressible in schema.prisma.

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_priority_check"
  CHECK ("priority" IN ('low', 'medium', 'high'));

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_status_check"
  CHECK ("status" IN ('planned', 'in_progress', 'done', 'skipped'));

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_duration_minutes_check"
  CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0);

ALTER TABLE "habit_topics"
  ADD CONSTRAINT "habit_topics_status_check"
  CHECK ("status" IN ('planned', 'in_progress', 'done', 'skipped'));

ALTER TABLE "habits"
  ADD CONSTRAINT "habits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "completions"
  ADD CONSTRAINT "completions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "daily_planner_tasks"
  ADD CONSTRAINT "daily_planner_tasks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "habit_topics"
  ADD CONSTRAINT "habit_topics_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
