import type { AchievementLevel } from "@/lib/date";
import { cn } from "@/lib/utils";

export function LevelBadge({
  level,
  className,
}: {
  level: AchievementLevel | null;
  className?: string;
}) {
  if (!level) {
    return (
      <span className={cn("text-xs font-medium text-muted-foreground", className)}>
        N/A
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-bold text-white",
        className,
      )}
      style={{ backgroundColor: level.color }}
    >
      {level.label}
    </span>
  );
}
