"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { PlannerPriority, PlannerTask } from "@/lib/planner-types";
import { usePlannerStore } from "@/stores/planner.store";

function EditTaskForm({
  task,
  onCancel,
}: {
  task: PlannerTask;
  onCancel: () => void;
}) {
  const updateTask = usePlannerStore((s) => s.updateTask);
  const [title, setTitle] = React.useState(task.title);
  const [startTime, setStartTime] = React.useState(task.startTime ?? "");
  const [duration, setDuration] = React.useState(
    task.durationMinutes ? String(task.durationMinutes) : "",
  );
  const [priority, setPriority] = React.useState<PlannerPriority>(
    task.priority,
  );
  const [notes, setNotes] = React.useState(task.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: trimmed,
        startTime: startTime || null,
        durationMinutes: duration ? Number(duration) : null,
        priority,
        notes: notes || null,
      });
      setSaving(false);
      onCancel();
      toast.success("Task updated");
    } catch (error) {
      setSaving(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task",
      );
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to happen?"
          autoFocus
          disabled={saving}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-time">Start time</Label>
          <Input
            id="edit-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-duration">Duration (min)</Label>
          <Input
            id="edit-duration"
            type="number"
            min="1"
            step="5"
            placeholder="30"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      {/* priority */}
      <div className="space-y-2">
        <Label htmlFor="edit-priority">Priority</Label>
        <select
          id="edit-priority"
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as PlannerPriority)
          }
          disabled={saving}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      {/* notes */}
      <div className="space-y-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <textarea
          id="edit-notes"
          placeholder="Link, context, or definition of done"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={saving}
          className="min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || saving}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditTaskDialog() {
  const task = usePlannerStore(
    (s) => s.tasks.find((item) => item.id === s.editingTaskId) ?? null,
  );
  const closeEditTask = usePlannerStore((s) => s.closeEditTask);

  return (
    <Dialog
      open={!!task}
      onOpenChange={(open) => {
        if (!open) closeEditTask();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        {task && (
          <EditTaskForm key={task.id} task={task} onCancel={closeEditTask} />
        )}
      </DialogContent>
    </Dialog>
  );
}
