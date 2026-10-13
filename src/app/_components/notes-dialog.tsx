"use client";

import * as React from "react";
import { useHabitStore } from "@/stores/habit.store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Habit } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
}

function NotesFields({
  habit,
  close,
}: {
  habit: Habit;
  close: () => void;
}) {
  const saveNotes = useHabitStore((s) => s.saveNotes);
  const liveNote = useHabitStore((s) => s.habits.find((h) => h.id === habit.id)?.notes ?? null);

  const [draft, setDraft] = React.useState(liveNote ?? "");
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    setSaving(true);
    try {
      await saveNotes(habit.id, trimmed || null);
      setDraft(trimmed);
      setEditing(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save notes"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(liveNote ?? "");
    setEditing(false);
  };

  return (
    <>
      <div className="max-h-70 min-h-45 overflow-y-auto rounded-md bg-background px-3 py-2 text-sm">
        {editing ? (
          <textarea
            className="min-h-70 max-h-80 w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Add notes..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        ) : draft ? (
          <p className="whitespace-pre-wrap">{draft}</p>
        ) : (
          <p className="text-muted-foreground italic">No notes yet.</p>
        )}
      </div>
      <DialogFooter>
        {editing ? (
          <>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
            <Button onClick={() => setEditing(true)}>
              {draft ? "Edit" : "Add Notes"}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

export function NotesDialog({
  open,
  onOpenChange,
  habit,
}: NotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>
            {habit?.name}
            {habit && (
              <Link
                href={`/habits/${habit.id}/milestones`}
                className="ml-2 text-xs underline underline-offset-2 hover:text-foreground"
              >
                Manage milestones
              </Link>
            )}
          </DialogDescription>
        </DialogHeader>
        {open && habit && (
          <NotesFields
            key={`${open}-${habit.id}`}
            habit={habit}
            close={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
