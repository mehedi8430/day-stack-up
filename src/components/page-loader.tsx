"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import styles from "./page-loader.module.css";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const DEFAULT_MESSAGES = [
  "Getting things ready…",
  "Loading your workspace…",
  "Almost there…",
] as const;

function subscribeToReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

const FRAME_CLASSES = {
  "below-header": "min-h-[calc(100svh-3.5rem)]",
  fullscreen: "min-h-svh",
  contained: "w-full",
} as const;

interface PageLoaderProps {
  messages?: readonly string[];
  label?: string;
  hint?: string;
  frame?: keyof typeof FRAME_CLASSES;
  className?: string;
}

export function PageLoader({
  messages = DEFAULT_MESSAGES,
  label = "Loading…",
  hint,
  frame = "below-header",
  className,
}: PageLoaderProps) {
  const reducedMotion = React.useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    if (reducedMotion || messages.length < 2) return;

    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [messages.length, reducedMotion]);

  const message = messages[messageIndex] ?? messages[0] ?? "Loading…";

  return (
    <div
      className={cn(
        "grid place-items-center px-4 py-10",
        FRAME_CLASSES[frame],
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className={styles.panel}>
        <div className={styles.mark} aria-hidden="true">
          <span className={styles.glow} />
          <span className={cn(styles.tile, styles.tileTop)} />
          <span className={cn(styles.tile, styles.tileMiddle)} />
          <span className={cn(styles.tile, styles.tileBottom)} />
        </div>

        <div className={styles.copy} aria-hidden="true">
          <p key={messageIndex} className={styles.message}>
            {message}
          </p>
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </div>

        <div className={styles.progress} aria-hidden="true">
          <span className={styles.progressBar} />
        </div>

        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
