import { notFound } from "next/navigation";
import { getHabitMilestones } from "@/app/actions/milestone.actions";
import { MilestoneManager } from "@/app/habits/[habitId]/milestones/_components/milestone-manager";

export default async function HabitMilestonesPage({
  params,
}: {
  params: Promise<{ habitId: string }>;
}) {
  const { habitId } = await params;
  const data = await getHabitMilestones(habitId);
  if (!data.habit) notFound();

  return (
    <MilestoneManager
      habitId={habitId}
      habitName={data.habit.name}
      initialGoal={data.habit.goal}
      category={data.habit.category}
      initialMilestones={data.milestones}
    />
  );
}