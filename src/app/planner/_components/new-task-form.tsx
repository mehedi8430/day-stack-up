"use client";

import * as React from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PlannerPriority } from "@/lib/planner-types";
import { usePlannerStore } from "@/stores/planner.store";

export function NewTaskForm({ date }: { date: string }) {
  const createTask = usePlannerStore((s) => s.createTask);
  const [title, setTitle] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [priority, setPriority] = React.useState<PlannerPriority>("medium");
  const [notes, setNotes] = React.useState("");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createTask({
        title: trimmed,
        date,
        startTime: startTime || undefined,
        durationMinutes: duration ? Number(duration) : undefined,
        priority,
        notes: notes || undefined,
      });
      setTitle("");
      setStartTime("");
      setDuration("");
      setNotes("");
      setPriority("medium");
      setDetailsOpen(false);
      toast.success("Task added to your planner");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add task",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to happen?"
          aria-label="Task title"
          autoComplete="off"
          autoFocus
          disabled={saving}
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <Input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            aria-label="Start time"
            title="Start time"
            disabled={saving}
            className="w-32"
          />
          <Button
            type="submit"
            disabled={!title.trim() || saving}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={detailsOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
          {detailsOpen ? "Hide details" : "Add details"}
        </button>
        {!detailsOpen && (
          <span className="text-xs text-muted-foreground">
            Press Enter after entering a task title to add it quickly.
          </span>
        )}
      </div>
      {detailsOpen && (
        <div className="mt-4 border-t pt-4">
          <div className="flex gap-4 w-full">
            {/* Duration */}
            <div className="space-y-2 w-full">
              <Label htmlFor="task-duration">Duration</Label>
              <div className="relative">
                <Input
                  id="task-duration"
                  type="number"
                  min="1"
                  step="5"
                  placeholder="30"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">
                  min
                </span>
              </div>
            </div>
            {/* Priority */}
            <div className="space-y-2 w-full">
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as PlannerPriority)
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          {/* Notes */}
          <div className="space-y-2 mt-4">
            <Label htmlFor="task-notes">Notes</Label>
            <textarea
              id="task-notes"
              placeholder="Link, context, or definition of done"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </form>
  );
}
