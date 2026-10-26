import { redirect } from "next/navigation";
import { getInitialData } from "@/app/actions/habit.actions";
import { HabitProgress } from "./_components/habit-progress";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string }>;
}) {
  const data = await getInitialData();

  if (!data.user) {
    redirect("/login");
  }

  const { habit } = await searchParams;
  const initialHabitId =
    typeof habit === "string" && data.habits.some((item) => item.id === habit)
      ? habit
      : null;

  return (
    <div className="p-4 sm:p-8">
      <HabitProgress
        initialHabits={data.habits}
        initialCompletions={data.completions}
        initialSchedules={data.schedules}
        initialHabitId={initialHabitId}
      />
    </div>
  );
}
