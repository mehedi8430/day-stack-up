"use client";

import * as React from "react";
import { getElapsedSeconds } from "@/lib/focus-timer";
import type { FocusSession } from "@/lib/focus-types";

interface DisplayClock {
  sessionId: string;
  status: string;
  segmentStartedAt: string | null;
  now: number;
}

export function useFocusElapsed(session: FocusSession | null): number {
  const [clock, setClock] = React.useState<DisplayClock | null>(null);

  React.useEffect(() => {
    if (!session || session.status !== "running") return;

    const timer = window.setInterval(() => {
      setClock({
        sessionId: session.id,
        status: session.status,
        segmentStartedAt: session.segmentStartedAt,
        now: Date.now(),
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session]);

  if (!session) return 0;
  if (session.status !== "running") return getElapsedSeconds(session, 0);

  const segmentStart = session.segmentStartedAt
    ? Date.parse(session.segmentStartedAt)
    : NaN;
  const clockMatches =
    clock?.sessionId === session.id &&
    clock.status === session.status &&
    clock.segmentStartedAt === session.segmentStartedAt;
  const reference = clockMatches
    ? clock.now
    : Number.isNaN(segmentStart)
      ? 0
      : segmentStart;

  return getElapsedSeconds(session, reference);
}
