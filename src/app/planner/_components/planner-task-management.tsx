"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckCircle2 } from "lucide-react";
import { NewTaskForm } from "@/app/planner/_components/new-task-form";
import { TaskRow } from "@/app/planner/_components/task-row";
import type { PlannerTask } from "@/lib/planner-types";
import { sortPlannerTasks } from "@/lib/planner-utils";
import { usePlannerStore } from "@/stores/planner.store";
import { notifyPlannerError } from "./planner-feedback";

export function PlannerTaskManagement() {
  const tasks = usePlannerStore((s) => s.tasks);
  const selectedDate = usePlannerStore((s) => s.selectedDate);
  const isLoading = usePlannerStore((s) => s.isLoading);
  const reorderTasks = usePlannerStore((s) => s.reorderTasks);
  const [order, setOrder] = React.useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const dayTasks = React.useMemo(
    () => sortPlannerTasks(tasks.filter((task) => task.date === selectedDate)),
    [tasks, selectedDate],
  );

  const orderedDayTasks = React.useMemo(() => {
    const dayIds = dayTasks.map((task) => task.id);
    const kept = order.filter((id) => dayIds.includes(id));
    const added = dayIds.filter((id) => !kept.includes(id));
    return [...kept, ...added];
  }, [order, dayTasks]);

  const sortedTasks = orderedDayTasks
    .map((id) => dayTasks.find((task) => task.id === id))
    .filter((task): task is PlannerTask => Boolean(task));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedDayTasks.indexOf(active.id as string);
    const newIndex = orderedDayTasks.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const previousOrder = order;
    const reordered = arrayMove(orderedDayTasks, oldIndex, newIndex);
    setOrder(reordered);
    void reorderTasks(reordered).catch((error) => {
      setOrder(previousOrder);
      notifyPlannerError(error, "Failed to reorder tasks");
    });
  };

  return (
    <div className="space-y-6">
      <NewTaskForm date={selectedDate} />

      <section aria-live="polite" aria-busy={isLoading} className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Click the status circle to move a task forward.
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
        ) : sortedTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">Nothing scheduled yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the one task that would make this day meaningful.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedTasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}
