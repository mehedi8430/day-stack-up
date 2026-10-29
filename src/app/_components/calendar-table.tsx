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
import { format, isToday } from "date-fns";
import { toKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/types";
import type { ScheduleTimelines } from "@/lib/habit-progress";
import type { CalendarView } from "@/app/_components/calendar-utils";
import { SortableRow } from "@/app/_components/sortable-row";

interface CalendarTableProps {
  days: Date[];
  habits: Habit[];
  completions: Record<string, boolean>;
  schedules: ScheduleTimelines;
  view: CalendarView;
  toggle: (habitId: string, date: Date) => void;
  onReorder: (ids: string[]) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  onOpenNotes: (habit: Habit) => void;
}

export function CalendarTable({
  days,
  habits,
  completions,
  schedules,
  view,
  toggle,
  onReorder,
  onEdit,
  onDelete,
  onOpenNotes,
}: CalendarTableProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = habits.map((habit) => habit.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  const habitCol = isMobile ? 180 : 340;
  const dayCol = isMobile ? 40 : 48;
  const counterCol = isMobile ? 48 : 64;
  const cols = `${habitCol}px repeat(${days.length}, minmax(${dayCol}px, 1fr)) ${counterCol}px`;

  return (
    <div className="overflow-auto rounded-lg border">
      <div className="grid min-w-max" style={{ gridTemplateColumns: cols }}>
        {/* Header row */}
        <div className="sticky left-0 z-30 flex items-center border-b border-r bg-card px-3 py-3 font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
          Habit
        </div>
        {days.map((day) => {
          const todayCol = isToday(day);
          return (
            <div
              key={toKey(day)}
              className={cn(
                "flex flex-col items-center justify-center border-b border-r py-2 text-xs",
                todayCol && "bg-primary/10",
              )}
            >
              <span className="font-semibold uppercase text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  todayCol && "bg-primary font-bold text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
        <div className="sticky right-0 z-30 flex items-center justify-center border-b border-l bg-card py-3 font-semibold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.2)]">
          ✔
        </div>

        {/* Habit rows */}
        <div className="contents group">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={habits.map((habit) => habit.id)}
              strategy={verticalListSortingStrategy}
            >
              {habits.map((habit) => (
                <SortableRow
                  key={habit.id}
                  habit={habit}
                  days={days}
                  completions={completions}
                  timelines={schedules}
                  view={view}
                  toggle={toggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onOpenNotes={onOpenNotes}
                  cols={cols}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
