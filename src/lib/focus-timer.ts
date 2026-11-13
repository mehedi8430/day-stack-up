type ElapsedInput = {
  status: string;
  accumulatedSeconds: number;
  segmentStartedAt: string | null;
};

export function getElapsedSeconds(
  session: ElapsedInput,
  nowMs: number,
): number {
  const accumulated = Math.max(0, Math.floor(session.accumulatedSeconds));
  if (session.status !== "running" || !session.segmentStartedAt) {
    return accumulated;
  }

  const segmentStart = Date.parse(session.segmentStartedAt);
  if (Number.isNaN(segmentStart)) return accumulated;

  return accumulated + Math.max(0, Math.floor((nowMs - segmentStart) / 1000));
}

export function formatFocusElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = remainder.toString().padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function getTrackedMinuteSync(
  reportedSeconds: number,
  elapsedSeconds: number,
): { minutes: number; reportedSeconds: number } {
  const reported = Math.max(0, Math.floor(reportedSeconds));
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  const minutes = Math.floor(Math.max(0, elapsed - reported) / 60);

  return { minutes, reportedSeconds: reported + minutes * 60 };
}
