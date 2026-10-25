import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CalendarView } from "@/app/_components/calendar-utils";

interface CalendarToolbarProps {
  view: CalendarView;
  rangeLabel: string;
  rangeNoun: string;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
  onAddHabit: () => void;
}

export function CalendarToolbar({
  view,
  rangeLabel,
  rangeNoun,
  onViewChange,
  onPrevious,
  onNext,
  onReset,
  onAddHabit,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={view}
          onValueChange={(value) => onViewChange(value as CalendarView)}
        >
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="last15">Last 15</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevious}
            aria-label={`Previous ${rangeNoun}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-40 whitespace-nowrap text-center text-lg font-bold sm:min-w-52 sm:text-xl">
            {rangeLabel}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            aria-label={`Next ${rangeNoun}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} className="ml-1">
            {view === "week" ? "Last week" : "Today"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/planner">
          <Button variant="outline" className="gap-2 px-2.5 sm:px-4">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Planner</span>
          </Button>
        </Link>
        <Button onClick={onAddHabit} className="gap-2 px-2.5 sm:px-4">
          <Plus className="h-4 w-4" />{" "}
          <span className="hidden sm:inline">Add Habit</span>
        </Button>
      </div>
    </div>
  );
}
