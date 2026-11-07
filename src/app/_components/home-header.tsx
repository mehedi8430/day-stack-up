import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

interface HomeHeaderProps {
  now: Date | null;
}

export function HomeHeader({ now }: HomeHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">
          {now ? format(now, "EEEE, MMMM d") : "Your daily overview"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {now && now.getHours() < 12
            ? "Good morning"
            : now && now.getHours() < 17
              ? "Good afternoon"
              : "Welcome back"}
        </h1>
      </div>
      <Link
        href="/calendar"
        aria-label="Open habit calendar"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      >
        <CalendarDays className="size-5" />
      </Link>
    </header>
  );
}
