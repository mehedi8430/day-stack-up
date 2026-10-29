"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWeekDays } from "@/lib/date";
import { sortPlannerTasks } from "@/lib/planner-utils";
import { usePlannerStore } from "@/stores/planner.store";
import { DayTasksDialog } from "./day-tasks-dialog";
import { runPlannerAction } from "./planner-feedback";

const MAX_PREVIEW = 3;

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function WeekStrip({ onClose }: { onClose: () => void }) {
  const tasks = usePlannerStore((s) => s.tasks);
  const weekStart = usePlannerStore((s) => s.loadedWeekStart);
  const selectedDate = usePlannerStore((s) => s.selectedDate);
  const today = usePlannerStore((s) => s.today);
  const isLoading = usePlannerStore((s) => s.isLoading);
  const selectDate = usePlannerStore((s) => s.selectDate);
  const changeWeek = usePlannerStore((s) => s.changeWeek);
  const goToToday = usePlannerStore((s) => s.goToToday);
  const [activeDate, setActiveDate] = React.useState<string | null>(null);

  if (!weekStart) return null;

  const start = parseISO(`${weekStart}T12:00:00`);
  const days = getWeekDays(start);
  const end = days[days.length - 1] ?? start;

  const selectDateFromStrip = (date: string) => {
    runPlannerAction(selectDate(date), {
      fallback: "Failed to load planner",
    });
    document.getElementById("planner-tasks")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section
      className="rounded-xl border bg-card p-4 shadow-sm"
      aria-label="Week planner"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          See your whole week at a glance. Click a day to open it below, or add
          a task directly from any day.
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close weekly planner"
          title="Close weekly planner"
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">This week</h2>
          <p className="text-sm text-muted-foreground">
            {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              runPlannerAction(changeWeek(-1), {
                fallback: "Failed to load planner",
              })
            }
            aria-label="Previous week"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              runPlannerAction(goToToday(), {
                fallback: "Failed to load planner",
              })
            }
          >
            This week
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              runPlannerAction(changeWeek(1), {
                fallback: "Failed to load planner",
              })
            }
            aria-label="Next week"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={`flex gap-2 overflow-x-auto pb-1 ${isLoading ? "opacity-60" : ""}`}
        aria-busy={isLoading}
      >
        {days.map((day) => {
          const key = dateKey(day);
          const selected = key === selectedDate;
          const isToday = key === today;
          const dayTasks = sortPlannerTasks(
            tasks.filter((task) => task.date === key),
          );
          const preview = dayTasks.slice(0, MAX_PREVIEW);
          const moreCount = dayTasks.length - preview.length;
          const completed = dayTasks.filter(
            (task) => task.status === "done",
          ).length;

          return (
            <div
              key={key}
              className={`flex min-w-38 flex-1 flex-col rounded-lg border p-2.5 ${
                selected
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-muted"
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              <button
                type="button"
                onClick={() => selectDateFromStrip(key)}
                className="mb-2 flex items-center justify-between gap-1 rounded-md px-1 py-1 text-left hover:bg-muted/60 cursor-pointer"
                aria-label={`Open ${format(day, "EEEE MMM d")}`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEE")}
                  </p>
                  <p
                    className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}
                  >
                    {format(day, "d")}
                  </p>
                </div>
                {dayTasks.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {completed}/{dayTasks.length}
                  </span>
                )}
              </button>

              <div className="flex-1 space-y-1">
                {preview.length === 0 ? (
                  <p className="rounded-md border border-dashed px-2 py-2 text-center text-[11px] text-muted-foreground">
                    No tasks
                  </p>
                ) : (
                  preview.map((task) => (
                    <p
                      key={task.id}
                      className={`truncate rounded-md border-l-2 bg-muted/40 px-2 py-1 text-xs ${
                        task.status === "done"
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                  ))
                )}
                {moreCount > 0 && (
                  <p className="px-1 text-[11px] font-medium text-muted-foreground">
                    +{moreCount} more
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1"
                onClick={() => setActiveDate(key)}
              >
                <Plus className="h-4 w-4" />
                Add task
              </Button>
            </div>
          );
        })}
      </div>

      <DayTasksDialog
        date={activeDate}
        onClose={() => setActiveDate(null)}
      />
    </section>
  );
}
