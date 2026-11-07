import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

export function MilestonesCta() {
  return (
    <Link
      href="/habits"
      className="group flex items-center gap-3 rounded-2xl border bg-gradient-to-r from-violet-500/10 via-card to-amber-500/10 p-4 shadow-sm transition-colors hover:border-primary/30 sm:p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <Trophy className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Weekly achievement</span>
        <span className="block truncate text-xs text-muted-foreground">
          Keep building momentum with your habit milestones
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
        View milestones{" "}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
