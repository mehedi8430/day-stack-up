"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCategory, type HabitMilestone, type MilestoneStatus } from "@/lib/types";
import * as actions from "@/app/actions/milestone.actions";
import { emptyMilestone, MilestoneForm } from "./milestone-form";
import { MilestoneRow } from "./milestone-row";
import { MilestoneViewDialog } from "./milestone-view-dialog";

export function MilestoneManager({
  habitId,
  habitName,
  initialGoal,
  category,
  initialMilestones,
}: {
  habitId: string;
  habitName: string;
  initialGoal: string;
  category: string;
  initialMilestones: HabitMilestone[];
}) {
  const [goal] = React.useState(initialGoal);
  const [milestones, setMilestones] = React.useState(initialMilestones);
  const [form, setForm] = React.useState<
    typeof emptyMilestone | HabitMilestone | null
  >(null);
  const [viewing, setViewing] = React.useState<HabitMilestone | null>(null);
  const [toDelete, setToDelete] = React.useState<HabitMilestone | null>(null);
  const habitCategory = getCategory(category);
  const progress = milestones.length
    ? Math.floor(
        (milestones.reduce((total, milestone) => {
          if (milestone.status === "done") return total + 1;
          if (milestone.status === "in_progress") return total + 0.5;
          return total;
        }, 0) /
          milestones.length) *
          100,
      )
    : 0;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = milestones.findIndex(
      (milestone) => milestone.id === active.id,
    );
    const newIndex = milestones.findIndex(
      (milestone) => milestone.id === over.id,
    );
    const reordered = arrayMove(milestones, oldIndex, newIndex).map(
      (milestone, index) => ({ ...milestone, order: index }),
    );
    setMilestones(reordered);
    const result = await actions.reorderHabitMilestones(
      habitId,
      reordered.map((milestone) => milestone.id),
    );
    if ("error" in result) toast.error(result.error as string);
  };
  const updateStatus = async (
    milestone: HabitMilestone,
    status: MilestoneStatus,
  ) => {
    setMilestones((current) =>
      current.map((item) =>
        item.id === milestone.id ? { ...item, status } : item,
      ),
    );
    const result = await actions.updateHabitMilestone(milestone.id, habitId, {
      ...milestone,
      status,
    });
    if ("error" in result) {
      toast.error(result.error as string);
      setMilestones((current) =>
        current.map((item) => (item.id === milestone.id ? milestone : item)),
      );
    }
  };
  const removeMilestone = async (milestone: HabitMilestone) => {
    const result = await actions.deleteHabitMilestone(milestone.id, habitId);
    if ("error" in result) {
      toast.error(result.error as string);
      return;
    }
    setMilestones((current) =>
      current.filter((item) => item.id !== milestone.id),
    );
    toast.success("Milestone deleted");
  };

  return (
    <main className="space-y-10 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
      <header className="space-y-3">
        <BackButton fallbackHref="/">Go back</BackButton>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Milestones
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Big goals, broken into small wins.
          </h1>
          <Button onClick={() => setForm(emptyMilestone)}>
            <Plus className="h-4 w-4" />
            Add milestone
          </Button>
        </div>
      </header>
      <section className="w-full rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-[3px]"
            style={{ backgroundColor: habitCategory.color }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">
              {goal || habitName}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Milestones under the habit &quot;{habitName}&quot; · {habitCategory.label}
            </p>
          </div>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={milestones.map((milestone) => milestone.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {milestones.map((milestone) => (
                <MilestoneRow
                  key={milestone.id}
                  milestone={milestone}
                  onEdit={() => setForm(milestone)}
                  onDelete={() => setToDelete(milestone)}
                  onStatus={(status) => updateStatus(milestone, status)}
                  onView={() => setViewing(milestone)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {milestones.length === 0 && (
          <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            No milestones yet. Add the first milestone for this habit.
          </div>
        )}
        <div className="mt-5">
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Milestone progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Progress</span>
            <span className="font-semibold tabular-nums">{progress}%</span>
          </div>
        </div>
        <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {"id" in (form ?? {}) ? "Edit milestone" : "Add milestone"}
              </DialogTitle>
              <DialogDescription>
                {`id` in (form ?? {})
                  ? "Update the details for this milestone."
                  : "Add a new milestone for this habit."}
              </DialogDescription>
            </DialogHeader>
            {form && (
              <MilestoneForm
                habitId={habitId}
                initial={form}
                onCancel={() => setForm(null)}
                onSaved={(milestone) => {
                  setMilestones((current) =>
                    current.some((item) => item.id === milestone.id)
                      ? current.map((item) =>
                          item.id === milestone.id ? milestone : item,
                        )
                      : [...current, milestone],
                  );
                  setForm(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
        <MilestoneViewDialog
          milestone={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            if (viewing) setForm(viewing);
            setViewing(null);
          }}
        />
        <ConfirmDialog
          open={!!toDelete}
          onOpenChange={(open) => !open && setToDelete(null)}
          title="Delete milestone?"
          description={
            <>
              This will permanently remove{" "}
              <span className="font-semibold">{toDelete?.title}</span> from this
              habit. This action cannot be undone.
            </>
          }
          confirmLabel="Delete"
          onConfirm={() => {
            if (!toDelete) return;
            const milestone = toDelete;
            setToDelete(null);
            void removeMilestone(milestone);
          }}
        />
      </section>
    </main>
  );
}