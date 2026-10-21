"use client";

import * as React from "react";
import { usePlannerStore } from "@/stores/planner.store";

export function PlannerStatsSidebar() {
  const tasks = usePlannerStore((s) => s.tasks);
  const selectedDate = usePlannerStore((s) => s.selectedDate);
  const isLoading = usePlannerStore((s) => s.isLoading);

  const { completedCount, totalTaskCount, activeCount, scheduledMinutes } =
    React.useMemo(() => {
      const dayTasks = tasks.filter((task) => task.date === selectedDate);
      return {
        completedCount: dayTasks.filter((task) => task.status === "done")
          .length,
        totalTaskCount: dayTasks.length,
        activeCount: dayTasks.filter(
          (task) => task.status !== "done" && task.status !== "skipped",
        ).length,
        scheduledMinutes: dayTasks.reduce(
          (total, task) => total + (task.durationMinutes ?? 0),
          0,
        ),
      };
    }, [tasks, selectedDate]);

  if (isLoading) {
    return (
      <aside className="space-y-3" aria-label="Loading daily planner summary">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-lg border bg-card p-4"
            >
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="mt-3 h-8 w-24 rounded bg-muted" />
              <div className="mt-2 h-3 w-28 rounded bg-muted" />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Completed
          </p>
          <p className="mt-1 text-2xl font-bold">
            {completedCount}
            <span className="text-base font-normal text-muted-foreground">
              /{totalTaskCount}
            </span>
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Remaining
          </p>
          <p className="mt-1 text-2xl font-bold">{activeCount}</p>
          <p className="text-xs text-muted-foreground">
            planned or in progress
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Planned time
          </p>
          <p className="mt-1 text-2xl font-bold">
            {scheduledMinutes}
            <span className="text-base font-normal text-muted-foreground">
              {" "}min
            </span>
          </p>
          <p className="text-xs text-muted-foreground">from task estimates</p>
        </div>
      </div>
    </aside>
  );
}
