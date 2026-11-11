import assert from "node:assert/strict";
import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }
    const target = path.join(ROOT, "src", specifier.slice(2));
    return { url: `${pathToFileURL(target).href}.ts`, shortCircuit: true };
  },
});

const { getMonthDays, getWeekDays } = await import("../src/lib/date.ts");
const { buildTimeWorkedData } = await import("../src/lib/time-worked.ts");

function task(date, durationMinutes, status = "done") {
  return { date, durationMinutes, status };
}

test("month view defaults to weekly points", () => {
  const days = getMonthDays(2026, 10);
  const points = buildTimeWorkedData({
    view: "month",
    yearCursor: 2026,
    days,
    tasks: [],
  });

  assert.ok(points.length > 0);
  assert.ok(points.every((point) => point.week && point.date === undefined));
  assert.ok(points.every((point) => point.hours === 0 && point.mins === 0));
});

test("month view can build daily points", () => {
  const days = getMonthDays(2026, 10);
  const points = buildTimeWorkedData({
    view: "month",
    yearCursor: 2026,
    days,
    monthGranularity: "day",
    tasks: [
      task("2026-11-02", 45),
      task("2026-11-02", 45, "in_progress"),
      task("2026-11-02", 30, "todo"),
      task("2026-11-03", null),
    ],
  });

  assert.equal(points.length, days.length);
  assert.equal(points[1].date, "Mon 2");
  assert.equal(points[1].full, "Nov 2");
  assert.equal(points[1].mins, 90);
  assert.equal(points[1].hours, 1.5);
  assert.equal(points[2].mins, 0);
});

test("week view builds daily points regardless of month granularity", () => {
  const days = getWeekDays(new Date(2026, 10, 11));
  const points = buildTimeWorkedData({
    view: "week",
    yearCursor: 2026,
    days,
    monthGranularity: "week",
    tasks: [task("2026-11-11", 30)],
  });

  assert.equal(points.length, 7);
  assert.ok(points.every((point) => point.date && point.week === undefined));
  assert.equal(points[4].mins, 30);
});

test("year view builds one point per month", () => {
  const points = buildTimeWorkedData({
    view: "year",
    yearCursor: 2026,
    days: [],
    tasks: [task("2026-01-15", 120)],
  });

  assert.equal(points.length, 12);
  assert.equal(points[0].month, "Jan");
  assert.equal(points[0].full, "January 2026");
  assert.equal(points[0].hours, 2);
});
