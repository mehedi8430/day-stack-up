"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { format, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useHabitStore } from "@/stores/store";
import { getMonthDays, toKey } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HabitForm } from "@/app/_components/habit-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Habit } from "@/lib/types";
import { CompletionRow } from "@/app/actions/habit.actions";
import { toast } from "sonner";
import { NotesDialog } from "@/app/_components/notes-dialog";
import { SortableRow } from "@/app/_components/sortable-row";

interface CalendarGridProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
}

export function CalendarGrid({
  initialHabits,
  initialCompletions,
}: CalendarGridProps) {
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const initialized = useHabitStore((s) => s.initialized);
  const initialize = useHabitStore((s) => s.initialize);
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const reorderHabits = useHabitStore((s) => s.reorderHabits);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);

  React.useEffect(() => {
    if (!initialized) {
      initialize(initialHabits, initialCompletions);
    }
  }, [initialized, initialize, initialHabits, initialCompletions]);

  const [cursor, setCursor] = React.useState<Date>(new Date());
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);
  const [toDelete, setToDelete] = React.useState<Habit | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [notesDialog, setNotesDialog] = React.useState<{
    habit: Habit;
  } | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const days = React.useMemo(
    () => getMonthDays(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const sortedHabits = React.useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits],
  );

  const habitCol = isMobile ? 180 : 340;
  const dayCol = isMobile ? 40 : 48;
  const counterCol = isMobile ? 48 : 64;
  const cols = `${habitCol}px repeat(${days.length}, minmax(${dayCol}px, 1fr)) ${counterCol}px`;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sortedHabits.map((h) => h.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    reorderHabits(arrayMove(ids, oldIndex, newIndex));
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (h: Habit) => {
    setEditing(h);
    setFormOpen(true);
  };

  const monthLabel = format(cursor, "MMMM yyyy");

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor((c) => subMonths(c, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-32 text-center text-xl font-bold sm:min-w-40">
              {monthLabel}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCursor(new Date())}
              className="ml-1"
            >
              Today
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/planner">
              <Button variant="outline" className="gap-2 px-2.5 sm:px-4">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Daily Planner</span>
              </Button>
            </Link>
            <Button onClick={openAdd} className="gap-2 px-2.5 sm:px-4">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Habit</span>
            </Button>
          </div>
        </div>

        {sortedHabits.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="overflow-auto rounded-lg border">
            <div
              className="grid min-w-max"
              style={{ gridTemplateColumns: cols }}
            >
              {/* Header row */}
              <div className="sticky left-0 z-30 flex items-center border-b border-r bg-card px-3 py-3 font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                Habit
              </div>
              {days.map((d) => {
                const todayCol = isToday(d);
                return (
                  <div
                    key={toKey(d)}
                    className={cn(
                      "flex flex-col items-center justify-center border-b border-r py-2 text-xs",
                      todayCol && "bg-primary/10",
                    )}
                  >
                    <span className="font-semibold uppercase text-muted-foreground">
                      {format(d, "EEE")}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                        todayCol &&
                          "bg-primary font-bold text-primary-foreground",
                      )}
                    >
                      {format(d, "d")}
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
                    items={sortedHabits.map((h) => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedHabits.map((h) => (
                      <SortableRow
                        key={h.id}
                        habit={h}
                        days={days}
                        completions={completions}
                        toggle={toggleCompletion}
                        onEdit={openEdit}
                        onDelete={setToDelete}
                        onOpenNotes={(habit) => setNotesDialog({ habit })}
                        cols={cols}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        )}
      </div>

      <HabitForm open={formOpen} onOpenChange={setFormOpen} habit={editing} />

      {/* Delete habi alert dialog */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete habit?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold">{toDelete?.name}</span> and all of
              its completion history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!toDelete) return;
                try {
                  await deleteHabit(toDelete.id);
                  setToDelete(null);
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to delete habit",
                  );
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotesDialog
        open={!!notesDialog}
        onOpenChange={(o) => !o && setNotesDialog(null)}
        habit={notesDialog?.habit ?? null}
      />
    </TooltipProvider>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
      <div className="mb-4 text-6xl">📋</div>
      <h3 className="text-lg font-semibold">No habits yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Start building a better you. Add your first habit and begin tracking
        your daily progress.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" /> Add your first habit
      </Button>
    </div>
  );
}
