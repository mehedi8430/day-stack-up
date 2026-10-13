"use client";

import * as React from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HabitMilestone } from "@/lib/types";
import * as actions from "@/app/actions/milestone.actions";

export const emptyMilestone: Omit<HabitMilestone, "id" | "habitId" | "order"> =
  {
    title: "",
    status: "planned",
    startDate: null,
    targetDate: null,
    details: "",
    resources: "",
  };

export function MilestoneForm({
  initial,
  onCancel,
  onSaved,
  habitId,
}: {
  initial: typeof emptyMilestone;
  onCancel: () => void;
  onSaved: (milestone: HabitMilestone) => void;
  habitId: string;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const isEditing = "id" in initial;

  const update = (field: keyof typeof emptyMilestone, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const result = isEditing
      ? await actions.updateHabitMilestone(
          (initial as HabitMilestone).id,
          habitId,
          {
            ...draft,
            title: draft.title.trim(),
          },
        )
      : await actions.createHabitMilestone(habitId, {
          ...draft,
          title: draft.title.trim(),
        });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error as string);
      return;
    }
    onSaved(result.milestone);
    toast.success(isEditing ? "Milestone updated" : "Milestone added");
  };

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_9rem_9rem]">
        <div className="space-y-2">
          <Label htmlFor="milestone-title">Milestone</Label>
          <Input
            id="milestone-title"
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Name this milestone"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="milestone-start">Start date</Label>
          <Input
            id="milestone-start"
            type="date"
            value={draft.startDate ?? ""}
            onChange={(event) => update("startDate", event.target.value || "")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="milestone-end">Target date</Label>
          <Input
            id="milestone-end"
            type="date"
            value={draft.targetDate ?? ""}
            onChange={(event) => update("targetDate", event.target.value || "")}
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <Label htmlFor="milestone-details">Details</Label>
        <textarea
          id="milestone-details"
          value={draft.details}
          onChange={(event) => update("details", event.target.value)}
          placeholder="What should be covered?"
          className="min-h-44 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Resources */}
      <div className="space-y-2">
        <Label htmlFor="milestone-resources">Resources</Label>
        <textarea
          id="milestone-resources"
          value={draft.resources}
          onChange={(event) => update("resources", event.target.value)}
          placeholder="Links, books, files, or references"
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* action buttons */}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={!draft.title.trim() || saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : isEditing ? "Save milestone" : "Add milestone"}
        </Button>
      </div>
    </form>
  );
}