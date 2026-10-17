import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LandingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header
      className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur"
      style={{
        marginInline: "calc(50% - 50vw)",
        paddingInline: "calc(50vw - 50%)",
      }}
    >
      <div className="mx-auto flex h-14 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/landing" className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo.svg"
            alt="DayStackUp logo"
            width={36}
            height={36}
            className="size-10 sm:size-12 rounded-md"
            priority
          />
          <div className="flex flex-col items-start leading-none">
            <span className="text-lg sm:text-xl font-bold tracking-tight">
              DayStackUp
            </span>
            <span className="text-[10px] italic sm:text-xs text-muted-foreground -mt-0.5 hidden sm:block">
              Stack your day. Keep moving up.
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href="#features">Features</a>
          </Button>
          {!isAuthed && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
          )}
          <Button asChild size="sm" className="gap-2">
            <Link href={isAuthed ? "/" : "/signup"}>
              {isAuthed ? "Open app" : "Start free"}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
