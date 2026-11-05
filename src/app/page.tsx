import { getInitialData } from "@/app/actions/habit.actions";
import { HomeDashboard } from "@/app/_components/home-dashboard";

export default async function HomePage() {
  const data = await getInitialData();

  return (
    <HomeDashboard
      initialHabits={data.habits}
      initialCompletions={data.completions}
      initialSchedules={data.schedules}
    />
  );
}
