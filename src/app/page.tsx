import { CalendarGrid } from "@/app/_components/calendar-grid";
import { HomeGreeting } from "@/app/_components/home-greeting";
import { getInitialData } from "@/app/actions/habit.actions";

export default async function HomePage() {
  const data = await getInitialData();

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <HomeGreeting
        initialHabits={data.habits}
        initialCompletions={data.completions}
      />
      <CalendarGrid initialHabits={data.habits} initialCompletions={data.completions} />
    </div>
  );
}
