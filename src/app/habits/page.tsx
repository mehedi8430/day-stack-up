import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getInitialData } from "@/app/actions/habit.actions";
import { getCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getInitialData();
  if (!data.user) notFound();
  const { habits } = data;

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        {/* <BackButton fallbackHref="/">Go back</BackButton> */}
        <h1 className="text-2xl font-bold tracking-tight">Milestones</h1>
        <p className="text-sm text-muted-foreground">
          Select a habit to manage its milestones and track progress.
        </p>
      </div>

      {habits.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No habits yet.{" "}
            <Link
              href="/"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Create your first habit
            </Link>{" "}
            on the calendar, then come back to add milestones.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">Habit</th>
                  <th scope="col" className="px-5 py-3">Category</th>
                  <th scope="col" className="px-5 py-3">Goal</th>
                  <th scope="col" className="px-5 py-3 text-right">Milestones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {habits.map((habit) => {
                  const cat = getCategory(habit.category);
                  return (
                    <tr key={habit.id} className="transition-colors hover:bg-muted/30">
                      <th scope="row" className="px-5 py-4 font-medium">
                        <Link
                          href={`/habits/${habit.id}/milestones`}
                          className="flex min-w-0 items-center gap-3 hover:underline"
                        >
                          {habit.emoji && (
                            <span className="shrink-0 text-xl" aria-hidden="true">
                              {habit.emoji}
                            </span>
                          )}
                          <span className="truncate">{habit.name}</span>
                        </Link>
                      </th>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
                          style={{
                            color: cat.color,
                            backgroundColor: `${cat.color}18`,
                            borderColor: `${cat.color}30`,
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                            aria-hidden="true"
                          />
                          {cat.label}
                        </span>
                      </td>
                      <td className="max-w-xl px-5 py-4 text-muted-foreground">
                        <span className="line-clamp-2">
                          {habit.goal || "No goal set"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/habits/${habit.id}/milestones`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          Manage <span aria-hidden="true">→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
