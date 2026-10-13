-- RLS policies: not expressible in schema.prisma. Mirrors supabase/migrations.

ALTER TABLE "habits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_planner_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habit_topics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
  ON "habits" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own habits"
  ON "habits" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own habits"
  ON "habits" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own habits"
  ON "habits" FOR DELETE USING (auth.uid() = "user_id");

CREATE POLICY "Users can view own completions"
  ON "completions" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own completions"
  ON "completions" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own completions"
  ON "completions" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own completions"
  ON "completions" FOR DELETE USING (auth.uid() = "user_id");

CREATE POLICY "Users can view own daily planner tasks"
  ON "daily_planner_tasks" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own daily planner tasks"
  ON "daily_planner_tasks" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own daily planner tasks"
  ON "daily_planner_tasks" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own daily planner tasks"
  ON "daily_planner_tasks" FOR DELETE USING (auth.uid() = "user_id");

CREATE POLICY "Users can view own habit topics"
  ON "habit_topics" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own habit topics"
  ON "habit_topics" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own habit topics"
  ON "habit_topics" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own habit topics"
  ON "habit_topics" FOR DELETE USING (auth.uid() = "user_id");
