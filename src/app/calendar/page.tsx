import { getInitialData } from "@/app/actions/habit.actions";
import CalendarGrid from "@/app/calendar/_components/calendar-grid";
import { HomeGreeting } from "../_components/home-greeting";

export default async function CalendarPage() {
  const data = await getInitialData();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <HomeGreeting
        initialHabits={data.habits}
        initialCompletions={data.completions}
      />

      <CalendarGrid
        initialHabits={data.habits}
        initialCompletions={data.completions}
        initialSchedules={data.schedules}
      />
    </div>
  );
}
