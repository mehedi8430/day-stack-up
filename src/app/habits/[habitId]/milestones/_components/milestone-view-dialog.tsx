"use client";

import { ExternalLink, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HabitMilestone } from "@/lib/types";
import { cn } from "@/lib/utils";
import { statusLabels, statusStyles } from "./milestone-row";

export function MilestoneViewDialog({
  milestone,
  onClose,
  onEdit,
}: {
  milestone: HabitMilestone | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!milestone) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            {milestone.title}
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                statusStyles[milestone.status],
              )}
            >
              {statusLabels[milestone.status]}
            </span>
          </DialogTitle>
          <DialogDescription>
            {milestone.startDate || "Anytime"}
            {milestone.targetDate ? ` — ${milestone.targetDate}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {milestone.details || "No details provided."}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resources
            </p>
            {milestone.resources ? (
              <p className="mt-1 inline-flex items-start gap-1 text-sm whitespace-pre-wrap">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {milestone.resources}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                No resources provided.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </Button>
          <Button type="button" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}