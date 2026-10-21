import { toast } from "sonner";

export function notifyPlannerError(error: unknown, fallback: string): void {
  toast.error(error instanceof Error ? error.message : fallback);
}

export function runPlannerAction(
  action: Promise<unknown>,
  options: { success?: string; fallback: string },
): void {
  void action.then(
    () => {
      if (options.success) toast.success(options.success);
    },
    (error) => notifyPlannerError(error, options.fallback),
  );
}
