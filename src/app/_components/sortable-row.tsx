"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isToday } from "date-fns";
import {
  GripVertical,
  Milestone,
  MoreVertical,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
import { getCategory, getWeeklyTargetLabel, Habit } from "@/lib/types";
import { toKey, formatFullDate } from "@/lib/date";
import {
  computeRangeRate,
  doneCounterFrom,
  scheduledDaysForRange,
} from "@/lib/habit-progress";
import type { ScheduleTimelines } from "@/types/habit-progress-types";
import type { CalendarView } from "@/app/_components/calendar-utils";
import { HabitCheckbox } from "@/components/ui/habit-checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SortableRow({
  habit,
  days,
  completions,
  timelines,
  view,
  toggle,
  onEdit,
  onDelete,
  onOpenNotes,
  cols,
}: {
  habit: Habit;
  days: Date[];
  completions: Record<string, boolean>;
  timelines: ScheduleTimelines;
  view: CalendarView;
  toggle: (habitId: string, date: Date) => void;
  onEdit: (h: Habit) => void;
  onDelete: (h: Habit) => void;
  onOpenNotes: (h: Habit) => void;
  cols: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: "1 / -1",
    gridTemplateColumns: cols,
  };

  const cat = getCategory(habit.category);
  
  const scheduledDaysOverride =
    view === "week" ? habit.weeklyTarget : scheduledDaysForRange(habit, days);
  const counter = doneCounterFrom(
    computeRangeRate([habit], timelines, completions, days),
    scheduledDaysOverride,
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("grid", isDragging && "relative z-10")}
    >
      <div
        className={cn(
          "sticky left-0 z-20 flex items-center gap-1 border-b border-r bg-card px-3 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]",
          isDragging && "bg-accent ring-2 ring-inset ring-primary",
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Link
          href={`/progress?habit=${encodeURIComponent(habit.id)}`}
          className="flex min-w-0 max-w-[120px] items-baseline text-left font-medium hover:underline sm:max-w-70"
          title="View progress"
        >
          <span className="min-w-0 truncate">{habit.name}</span>
          <span
            className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground"
            title={getWeeklyTargetLabel(habit.weeklyTarget)}
          >
            ({habit.weeklyTarget})
          </span>
        </Link>
        {/* <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: cat.color }}
          title={cat.label}
        /> */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 shrink-0"
              aria-label={`Actions for ${habit.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => onEdit(habit)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenNotes(habit)}>
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/habits/${habit.id}/milestones`}>
                <Milestone className="h-3.5 w-3.5" />
                Milestones
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(habit)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {days.map((d) => {
        const checked = !!completions[`${habit.id}__${toKey(d)}`];
        const today = isToday(d);
        return (
          <Tooltip key={toKey(d)}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center border-b border-r py-2",
                  today && "bg-primary/5",
                  isDragging && "bg-accent/50",
                )}
              >
                <HabitCheckbox
                  checked={checked}
                  onToggle={() => toggle(habit.id, d)}
                  color={cat.color}
                  today={today}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-semibold">{habit.name}</span>
              <span className="block text-muted-foreground">
                {formatFullDate(d)}
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}

      <div
        className={`sticky right-0 z-20 flex items-center justify-center border-b border-l bg-card px-3 py-2 font-semibold text-sm shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.2)] ${counter.complete && "bg-green-600"}`}
      >
        <span>{counter.completed}</span>
        {counter.scheduled && (
          <span
            className=""
            title={`Days targeted for this ${
              view === "week"
                ? "week"
                : view === "month"
                  ? "month"
                  : "15-day window"
            }`}
          >
            /{counter.scheduled}
          </span>
        )}
      </div>
    </div>
  );
}
