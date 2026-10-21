"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HabitMilestone, MilestoneStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const statusLabels: Record<MilestoneStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

export const statusStyles: Record<MilestoneStatus, string> = {
  planned:
    "border-slate-200 bg-background text-slate-600 dark:border-slate-700 dark:text-slate-300",
  in_progress:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  done: "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-600 dark:bg-emerald-600",
  skipped:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function MilestoneRow({
  milestone,
  onEdit,
  onDelete,
  onStatus,
  onView,
}: {
  milestone: HabitMilestone;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: MilestoneStatus) => void;
  onView: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-xl px-1 py-2 text-sm transition-colors hover:bg-muted/40 sm:gap-3 sm:px-2",
        isDragging && "relative z-10 bg-accent shadow-lg",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab justify-center text-muted-foreground/60 hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onStatus(milestone.status === "done" ? "planned" : "done")}
        aria-label={
          milestone.status === "done"
            ? `Mark ${milestone.title} as planned`
            : `Mark ${milestone.title} as done`
        }
        aria-pressed={milestone.status === "done"}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          milestone.status === "done"
            ? "border-emerald-500 bg-emerald-500 text-white"
            : milestone.status === "in_progress"
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
              : "border-muted-foreground/25 bg-background hover:border-foreground/50",
        )}
      >
        {milestone.status === "done" && <Check className="h-3 w-3" />}
      </button>
      <button
        type="button"
        onClick={onView}
        className={cn(
          "min-w-0 flex-1 truncate py-2 text-left font-medium hover:underline",
          milestone.status === "done" && "text-muted-foreground line-through",
        )}
        title={milestone.title}
        aria-label={`View ${milestone.title}`}
      >
        {milestone.title}
      </button>
      <select
        value={milestone.status}
        onChange={(event) => onStatus(event.target.value as MilestoneStatus)}
        className={cn(
          "h-7 max-w-28 shrink-0 cursor-pointer rounded-full border px-2 text-[10px] font-semibold outline-none sm:text-xs",
          statusStyles[milestone.status],
        )}
        aria-label={`Status for ${milestone.title}`}
      >
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
          aria-label="Edit milestone"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
          aria-label="Delete milestone"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}