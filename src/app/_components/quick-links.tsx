import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  ListTodo,
} from "lucide-react";

interface QuickLinksProps {
  tomorrowHref: string;
}

export function QuickLinks({ tomorrowHref }: QuickLinksProps) {
  const actions = [
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/habits", label: "Milestones", icon: ClipboardList },
    { href: tomorrowHref, label: "Plan tomorrow", icon: ListTodo },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <nav
      aria-label="Quick links"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {actions.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className="flex min-h-20 items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <span className="text-sm font-semibold leading-tight">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
