import { redirect } from "next/navigation";
import { getInitialData } from "@/app/actions/habit.actions";
import { HabitProgress } from "./_components/habit-progress";

export default async function ProgressPage() {
  const data = await getInitialData();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <div className="p-4 sm:p-8">
      <HabitProgress
        initialHabits={data.habits}
        initialCompletions={data.completions}
        initialSchedules={data.schedules}
      />
    </div>
  );
}
