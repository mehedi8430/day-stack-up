"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { NewTaskForm } from "@/app/planner/_components/new-task-form";
import { TaskRow } from "@/app/planner/_components/task-row";
import { sortPlannerTasks } from "@/lib/planner-utils";
import { usePlannerStore } from "@/stores/planner.store";

export function PlannerTaskManagement() {
  const tasks = usePlannerStore((s) => s.tasks);
  const selectedDate = usePlannerStore((s) => s.selectedDate);
  const isLoading = usePlannerStore((s) => s.isLoading);

  const dayTasks = React.useMemo(
    () => sortPlannerTasks(tasks.filter((task) => task.date === selectedDate)),
    [tasks, selectedDate],
  );

  return (
    <div className="space-y-6">
      <NewTaskForm date={selectedDate} />

      <section aria-live="polite" aria-busy={isLoading} className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Today&apos;s plan</h2>
          <p className="text-sm text-muted-foreground">
            Tasks are ordered by start time. Unscheduled tasks appear last.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-label="Loading tasks">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-muted" />
                    <div className="h-3 w-1/4 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-20 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : dayTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">Nothing scheduled yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the one task that would make this day meaningful.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {dayTasks.map((task) => (
              <li key={task.id}>
                <TaskRow task={task} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
