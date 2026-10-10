-- Removes the deprecated weekly recurring-goal feature. Weekly planning now
-- happens as concrete per-date tasks in public.daily_planner_tasks.

DROP TABLE IF EXISTS public.weekly_planner_goal_occurrences;
DROP TABLE IF EXISTS public.weekly_planner_goals;
