"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckCircle2 } from "lucide-react";
import { NewTaskForm } from "@/app/planner/_components/new-task-form";
import { TaskRow } from "@/app/planner/_components/task-row";
import type { PlannerStatus, PlannerTask } from "@/lib/planner-types";

export function PlannerTaskManagement({
  selectedDate,
  isLoading,
  sortedTasks,
  sensors,
  onTaskCreated,
  onDragEnd,
  onStatusChange,
  onDeleteTask,
  onMoveTask,
  onEditTask,
}: {
  selectedDate: string;
  isLoading: boolean;
  sortedTasks: PlannerTask[];
  sensors: SensorDescriptor<SensorOptions>[];
  onTaskCreated: (task: PlannerTask) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onStatusChange: (task: PlannerTask, status: PlannerStatus) => void;
  onDeleteTask: (task: PlannerTask) => void;
  onMoveTask: (task: PlannerTask) => void;
  onEditTask: (task: PlannerTask) => void;
}) {
  return (
    <div className="space-y-6">
      <NewTaskForm date={selectedDate} onCreated={onTaskCreated} />

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
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sortedTasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onDelete={onDeleteTask}
                  onMoveNext={onMoveTask}
                  onEdit={onEditTask}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}
