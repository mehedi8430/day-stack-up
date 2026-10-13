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
import Link from "next/link";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HabitMilestone, MilestoneStatus } from "@/lib/types";
import * as actions from "@/app/actions/milestone.actions";
import { emptyMilestone, MilestoneForm } from "./milestone-form";
import { MilestoneRow } from "./milestone-row";
import { MilestoneViewDialog } from "./milestone-view-dialog";

export function MilestoneManager({
  habitId,
  habitName,
  initialGoal,
  initialMilestones,
}: {
  habitId: string;
  habitName: string;
  initialGoal: string;
  initialMilestones: HabitMilestone[];
}) {
  const [goal] = React.useState(initialGoal);
  const [milestones, setMilestones] = React.useState(initialMilestones);
  const [form, setForm] = React.useState<
    typeof emptyMilestone | HabitMilestone | null
  >(null);
  const [viewing, setViewing] = React.useState<HabitMilestone | null>(null);
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
    if (!window.confirm(`Delete milestone "${milestone.title}"?`)) return;
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
    <div className="space-y-6 p-4 sm:px-8 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackButton fallbackHref="/">Go back</BackButton>
          <h1 className="text-2xl font-bold tracking-tight">{habitName}</h1>
          <p className="text-sm text-muted-foreground">
            Manage the milestones behind this habit.
          </p>
        </div>
        <Button onClick={() => setForm(emptyMilestone)}>
          <Plus className="h-4 w-4" />
          Add milestone
        </Button>
      </div>
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Goal
          </p>
          {goal ? (
            <p className="mt-1 text-lg">{goal}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Goal is not set yet. Go to the{" "}
              <Link
                href="/"
                className="font-medium text-foreground underline underline-offset-4"
              >
                habit calendar
              </Link>{" "}
              and edit this habit to set a goal.
            </p>
          )}
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[2rem_minmax(10rem,1.2fr)_9rem_9rem_minmax(14rem,1fr)_minmax(14rem,1fr)_5rem_5rem] items-center gap-x-4 bg-muted/60 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span />
              <span className="px-3">Milestone</span>
              <span className="">Start date</span>
              <span className="">Target date</span>
              <span className="px-3">Details</span>
              <span className="px-3">Resources</span>
              <span className="px-2">Status</span>
              <span className="px-2">Actions</span>
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
                {milestones.map((milestone) => (
                  <MilestoneRow
                    key={milestone.id}
                    milestone={milestone}
                    onEdit={() => setForm(milestone)}
                    onDelete={() => removeMilestone(milestone)}
                    onStatus={(status) => updateStatus(milestone, status)}
                    onView={() => setViewing(milestone)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {milestones.length === 0 && (
              <div className="border-t px-6 py-12 text-center text-sm text-muted-foreground">
                No milestones yet. Add the first milestone for this habit.
              </div>
            )}
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
      </section>
    </div>
  );
}