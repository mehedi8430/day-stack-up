"use client";

import * as React from "react";
import { useHabitStore } from "@/stores/habit.store";
import { Habit, CATEGORIES, getWeeklyTargetLabel } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface HabitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
}

const WEEKLY_TARGET_DAYS = [7, 6, 5, 4, 3, 2, 1] as const;

function HabitFormFields({
  habit,
  close,
}: {
  habit: Habit | null;
  close: () => void;
}) {
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);

  const [name, setName] = React.useState(habit?.name ?? "");
  const [category, setCategory] = React.useState(
    habit?.category ?? CATEGORIES[0].id,
  );
  const [goal, setGoal] = React.useState(habit?.goal ?? "");
  const [weeklyTarget, setWeeklyTarget] = React.useState(
    String(habit?.weeklyTarget ?? 7),
  );
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const target = Number(weeklyTarget);
      if (habit) {
        await updateHabit(habit.id, {
          name: trimmed,
          category,
          goal: goal.trim(),
          weeklyTarget: target,
        });
      } else {
        await addHabit({
          name: trimmed,
          category,
          goal: goal.trim(),
          weeklyTarget: target,
        });
      }
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save habit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="habit-name">Name</Label>
          <Input
            id="habit-name"
            placeholder="e.g. Wake Up on Time"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="habit-weekly-target">Weekly target</Label>
          <Select
            value={weeklyTarget}
            onValueChange={setWeeklyTarget}
          >
            <SelectTrigger id="habit-weekly-target">
              <SelectValue placeholder="Select a target" />
            </SelectTrigger>
            <SelectContent>
              {WEEKLY_TARGET_DAYS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {getWeeklyTargetLabel(days)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Daily habits use Every day. Choose fewer days for weekly goals
            such as exercising 5 days a week. Changing the target starts from
            today; past progress keeps the previous target.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="habit-goal">Goal</Label>
          <textarea
            id="habit-goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="What do you want to achieve with this habit?"
            className="min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? "Saving..." : habit ? "Save Changes" : "Add Habit"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function HabitForm({ open, onOpenChange, habit }: HabitFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habit ? "Edit Habit" : "Add Habit"}</DialogTitle>
          <DialogDescription>
            {habit
              ? "Update your habit details below."
              : "Create a new habit to start tracking."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <HabitFormFields
            key={`${open}-${habit?.id ?? "new"}`}
            habit={habit ?? null}
            close={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
