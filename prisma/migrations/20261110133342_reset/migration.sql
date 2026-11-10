/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "completions" DROP CONSTRAINT "completions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_planner_tasks" DROP CONSTRAINT "daily_planner_tasks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "habit_schedules" DROP CONSTRAINT "habit_schedules_habit_id_fkey";

-- DropForeignKey
ALTER TABLE "habit_schedules" DROP CONSTRAINT "habit_schedules_user_id_fkey";

-- DropForeignKey
ALTER TABLE "habit_topics" DROP CONSTRAINT "habit_topics_user_id_fkey";

-- DropForeignKey
ALTER TABLE "habits" DROP CONSTRAINT "habits_user_id_fkey";

-- DropTable
DROP TABLE "auth"."users";

-- AddForeignKey
ALTER TABLE "habit_schedules" ADD CONSTRAINT "habit_schedules_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
