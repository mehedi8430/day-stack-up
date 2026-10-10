import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlannerHeader({
  date,
  onChangeDate,
  onToday,
  isWeekStripOpen,
  onOpenWeekStrip,
}: {
  date: Date;
  onChangeDate: (offset: number) => void;
  onToday: () => void;
  isWeekStripOpen: boolean;
  onOpenWeekStrip: () => void;
}) {
  return (
    <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Planner</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Plan your work in time blocks, keep the next action visible, and close
          the day with a clear record of what moved forward.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!isWeekStripOpen && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={onOpenWeekStrip}
          >
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">Weekly planner</span>
          </Button>
        )}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChangeDate(-1)}
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isToday(date) ? "secondary" : "ghost"}
            size="sm"
            onClick={onToday}
          >
            {isToday(date)
              ? "Today"
              : isTomorrow(date)
                ? "Tomorrow"
                : isYesterday(date)
                  ? "Yesterday"
                  : format(date, "EEE, MMM d")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChangeDate(1)}
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
