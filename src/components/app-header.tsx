"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Moon,
  Sun,
  CalendarDays,
  BarChart3,
  LogOut,
  ClipboardList,
  ListTodo,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppHeader({ isAuthorized }: { isAuthorized: boolean }) {
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
    { href: "/", label: "Calendar", icon: CalendarDays },
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
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur px-4 sm:px-6">
      <div className="container flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
            <Image
              src="/logo.svg"
              alt="DayStackUp logo"
              width={36}
              height={36}
              className="size-10 sm:size-14 rounded-md"
              priority
            />
            <div className="flex flex-col items-start leading-none">
              <span className="text-lg sm:text-xl tracking-tight">
                DayStackUp
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground -mt-0.5 hidden sm:block">
                Stack your day. Keep moving up.
              </span>
            </div>
          </Link>
          {isAuthorized && (
            <nav className="hidden items-center gap-1 md:flex">
              {links.map((l) => {
                const Icon = l.icon;
                return (
                  <Link key={l.href} href={l.href}>
                    <Button
                      variant={isActive(l.href) ? "secondary" : "ghost"}
                      size="sm"
                      className={cn("gap-2")}
                    >
                      <Icon className="h-4 w-4" />
                      {l.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAuthorized && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLogoutDialogOpen(true)}
              aria-label="Log out"
              disabled={loggingOut}
              className="hidden sm:inline-flex"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          {isAuthorized && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Main navigation
                  </SheetDescription>
                </SheetHeader>
                <nav className="mt-2 flex flex-col gap-1">
                  {links.map((l) => {
                    const Icon = l.icon;
                    return (
                      <SheetClose asChild key={l.href}>
                        <Link href={l.href}>
                          <Button
                            variant={isActive(l.href) ? "secondary" : "ghost"}
                            className="w-full justify-start gap-2"
                          >
                            <Icon className="h-4 w-4" />
                            {l.label}
                          </Button>
                        </Link>
                      </SheetClose>
                    );
                  })}
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      className="mt-2 w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => setLogoutDialogOpen(true)}
                      disabled={loggingOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </Button>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
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
  );
}
