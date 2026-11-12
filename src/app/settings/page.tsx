import { getWorkGoalSettings } from "@/app/actions/settings.actions";
import { SettingsForm } from "./_components/settings-form";

export default async function SettingsPage() {
  const workGoals = await getWorkGoalSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Personalize your goals and how progress is calculated.
        </p>
      </header>
      <SettingsForm initialWorkGoals={workGoals} />
    </div>
  );
}
