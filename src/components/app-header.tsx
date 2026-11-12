"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Moon,
  Sun,
  Home,
  CalendarDays,
  BarChart3,
  LogOut,
  ClipboardList,
  ListTodo,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader({
  isAuthorized,
  userEmail,
}: {
  isAuthorized: boolean;
  userEmail?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      setLogoutDialogOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to log out");
      setLoggingOut(false);
    }
  };

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/habits", label: "Milestones", icon: ClipboardList },
    { href: "/planner", label: "Planner", icon: ListTodo },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (pathname === "/landing") {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
        <div className="container flex h-14 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-bold"
            >
              <Image
                src="/logo.svg"
                alt="DayStackUp logo"
                width={36}
                height={36}
                className="size-9 rounded-md sm:size-10"
                priority
              />
              <div className="flex flex-col items-start leading-none">
                <span className="text-lg tracking-tight sm:text-xl">
                  DayStackUp
                </span>
                <span className="-mt-0.5 hidden text-[10px] text-muted-foreground sm:block sm:text-xs">
                  Stack your day. Keep moving up.
                </span>
              </div>
            </Link>
            {isAuthorized && (
              <nav className="hidden items-center gap-1 lg:flex">
                {links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.href} href={link.href}>
                      <Button
                        variant={isActive(link.href) ? "secondary" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        <Icon className="size-4" />
                        {link.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </Button>
            {isAuthorized && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 gap-1.5 px-1.5"
                    aria-label="Open account menu"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-full bg-violet-200 text-sm font-semibold text-violet-800 dark:bg-violet-900 dark:text-violet-200"
                    >
                      {userEmail?.trim().charAt(0).toUpperCase() || "U"}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <div className="truncate px-2 py-1.5 text-sm font-medium">
                    {userEmail || "Signed-in account"}
                  </div>
                  <div className="-mx-1 my-1 h-px bg-border" />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={loggingOut}
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setLogoutDialogOpen(true)}
                  >
                    <LogOut className="size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <ConfirmDialog
              open={logoutDialogOpen}
              onOpenChange={(open) => {
                if (!loggingOut) setLogoutDialogOpen(open);
              }}
              title="Log out?"
              description="You will be signed out of DayStackUp. You can log back in anytime."
              confirmLabel="Log out"
              cancelLabel="Cancel"
              variant="destructive"
              confirmDisabled={loggingOut}
              cancelDisabled={loggingOut}
              onConfirm={() => void handleLogout()}
            />
          </div>
        </div>
      </header>
      {isAuthorized && (
        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur lg:hidden"
        >
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium leading-none transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-[18px]", active && "stroke-[2.5]")} />
                <span className="max-w-full truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
