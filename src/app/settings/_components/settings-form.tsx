"use client";

import * as React from "react";
import { toast } from "sonner";
import { saveWorkGoalSettings } from "@/app/actions/settings.actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkGoalSettings } from "@/lib/settings";

export function SettingsForm({
  initialWorkGoals,
}: {
  initialWorkGoals: WorkGoalSettings;
}) {
  const [dailyHours, setDailyHours] = React.useState(
    String(initialWorkGoals.dailyTargetMinutes / 60),
  );
  const [workdaysPerWeek, setWorkdaysPerWeek] = React.useState(
    String(initialWorkGoals.workdaysPerWeek),
  );
  const [saving, setSaving] = React.useState(false);

  const dailyMinutes = Number(dailyHours) * 60;
  const weeklyHours = (dailyMinutes * Number(workdaysPerWeek)) / 60;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveWorkGoalSettings({
        dailyTargetMinutes: Math.round(dailyMinutes),
        workdaysPerWeek: Number(workdaysPerWeek),
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Work goals saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save work goals",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Work goals</CardTitle>
          <CardDescription>
            Set your daily target and weekly workday minimum. Your weekly hours
            goal is calculated from these values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="daily-target">Daily target hours</Label>
              <Input
                id="daily-target"
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                required
                value={dailyHours}
                onChange={(event) => setDailyHours(event.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Use 15-minute increments, from 15 minutes up to 24 hours.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workdays-per-week">
                Minimum qualifying days per week
              </Label>
              <Input
                id="workdays-per-week"
                type="number"
                min="1"
                max="7"
                step="1"
                required
                value={workdaysPerWeek}
                onChange={(event) => setWorkdaysPerWeek(event.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                A day qualifies when you reach your daily hours target.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">Weekly target</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {Number.isFinite(weeklyHours) ? weeklyHours : 0} hours
            </p>
            <p className="text-xs text-muted-foreground">
              {dailyHours || 0} hours × {workdaysPerWeek || 0} qualifying days.
              Week runs Saturday–Friday.
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save work goals"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
