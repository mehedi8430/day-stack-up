import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getInitialData } from "@/app/actions/habit.actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => {
            const cat = getCategory(habit.category);
            return (
              <Link
                key={habit.id}
                href={`/habits/${habit.id}/milestones`}
                className="group"
              >
                <Card className="transition-colors hover:border-foreground/20 hover:bg-accent/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {habit.emoji && (
                          <span className="text-2xl shrink-0">
                            {habit.emoji}
                          </span>
                        )}
                        <CardTitle className="truncate text-base">
                          {habit.name}
                        </CardTitle>
                      </div>
                      <span
                        className="h-3 w-3 shrink-0 rounded-full mt-1.5"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px]"
                      style={{
                        color: cat.color,
                        backgroundColor: cat.color + "18",
                        borderColor: cat.color + "30",
                        borderWidth: 1,
                      }}
                    >
                      {cat.label}
                    </Badge>
                    {habit.goal && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {habit.goal}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
