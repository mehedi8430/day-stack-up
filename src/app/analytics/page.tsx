import { Analytics } from "@/app/analytics/_components/analytics";
import { getInitialData } from "@/app/actions/habit.actions";
import { getPlannerTasksBetween } from "@/app/actions/planner.actions";
import { getWorkGoalSettings } from "@/app/actions/settings.actions";

export default async function AnalyticsPage() {
  const data = await getInitialData();
  const workGoals = await getWorkGoalSettings();
  const year = new Date().getFullYear();
  const planner = await getPlannerTasksBetween(
    `${year}-01-01`,
    `${year}-12-31`,
  );

  return (
    <div className="p-4 sm:p-8">
      <Analytics
        initialHabits={data.habits}
        initialCompletions={data.completions}
        initialSchedules={data.schedules}
        initialPlannerTasks={planner.tasks}
        workGoals={workGoals}
      />
    </div>
  );
}
