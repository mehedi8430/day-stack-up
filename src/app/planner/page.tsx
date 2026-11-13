import { format, parseISO } from "date-fns";
import { redirect } from "next/navigation";
import { getPlannerTasksBetween } from "@/app/actions/planner.actions";
import { getWeek } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { PlannerManagement } from "./_components/planner-management";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedParams = await searchParams;

  const today = format(new Date(), "yyyy-MM-dd");
  const requestedDate =
    resolvedParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(resolvedParams.date)
      ? resolvedParams.date
      : today;

  const week = getWeek(parseISO(`${requestedDate}T12:00:00`));
  const start = format(week.start, "yyyy-MM-dd");
  const end = format(week.end, "yyyy-MM-dd");

  const { tasks } = await getPlannerTasksBetween(start, end);

  return (
    <PlannerManagement
      initialTasks={tasks}
      today={today}
      selectedDate={requestedDate}
      weekStart={start}
    />
  );
}
