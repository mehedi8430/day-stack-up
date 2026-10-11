"use client";

import * as React from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "habit-theme";

function getTheme(): Theme {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  for (const listener of listeners) listener();
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function useTheme() {
  const theme = React.useSyncExternalStore(
    subscribe,
    getTheme,
    () => "dark" as Theme
  );
  return { theme, toggleTheme };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
