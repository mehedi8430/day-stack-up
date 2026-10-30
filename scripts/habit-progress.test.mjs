import assert from "node:assert/strict";
import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { test } from "node:test";

// This file must not statically import the app modules: the "@/" alias hook
// below has to be registered before anything loads them. Dynamic imports at
// the bottom satisfy that ordering.
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

const {
  DAYS_PER_WEEK,
  buildCompletionMap,
  buildScheduleTimelines,
  compareMetrics,
  computeHabitPeriodMetric,
  computeRangeRate,
  doneCounterFrom,
  formatTargetCount,
  scheduledDaysForRange,
  getPreviousProgressPeriod,
  getProgressPeriod,
  resolveWeeklyTarget,
  sanitizeWeeklyTarget,
  summarizeMetrics,
  isHabitEligibleOn,
} = await import("../src/lib/habit-progress.ts");

const { computeHabitStability } = await import(
  "../src/lib/habit-analytics.ts"
);

const {
  getMonthDays,
  getWeek,
  getWeekChunks,
  getWeekDays,
  shiftWeek,
  toKey,
} = await import("../src/lib/date.ts");

// Local-noon dates keep every assertion independent of the test machine's
// timezone: noon is far from any midnight boundary in every real zone.
const ymd = (year, month, day) => new Date(year, month - 1, day, 12);
const Y = 2026; // test year
// Current Sat-Fri week in the tests: Oct 17-23, 2026 (today = Wed Oct 21).
// Oct 1, 2026 is a Thursday, so Saturday anchors: Oct 3, 10, 17, 24, 31.
const MON = 19, TUE = 20, WED = 21, SUN = 25;

const baseHabit = {
  id: "h1",
  name: "Exercise",
  category: "fitness",
  createdAt: "2026-10-21T09:00:00.000Z",
  weeklyTarget: 5,
};

test("habit stability uses the last 12 completed weeks and measures variation", () => {
  const stability = computeHabitStability(
    { id: "h1", createdAt: "2026-01-01T09:00:00.000Z" },
    {
      "h1__2026-10-12": true,
      "h1__2026-10-13": true,
      "h1__2026-10-14": true,
      "h1__2026-10-15": true,
      "h1__2026-10-19": true,
      "h1__2026-10-20": true,
      "h1__2026-10-21": true,
      "h1__2026-10-22": true,
      "h1__2026-10-23": true,
      "h1__2026-10-24": true,
    },
    ymd(2026, 10, 26),
  );

  assert.equal(stability.weeklyCompletions.length, 12);
  // With Sat-Fri weeks: Sat Oct 10-16 holds the Mon-Thu completions (4),
  // Sat Oct 17-23 holds Mon-Fri (5), and Sat Oct 24+ is the current week,
  // which is excluded entirely.
  assert.deepEqual(stability.weeklyCompletions.slice(-2), [4, 5]);
  assert.equal(stability.min, 0);
  assert.equal(stability.max, 5);
  assert.equal(stability.variation, 5);
  assert.equal(stability.level, "moderate");
});

test("habit stability excludes partial creation weeks and waits for enough data", () => {
  const stability = computeHabitStability(
    { id: "h1", createdAt: "2026-10-20T09:00:00.000Z" },
    { "h1__2026-10-20": true },
    ymd(2026, 10, 26),
  );

  assert.deepEqual(stability.weeklyCompletions, []);
  assert.equal(stability.min, null);
  assert.equal(stability.max, null);
  assert.equal(stability.variation, null);
  assert.equal(stability.level, "building");
});

test("habit stability is high for steady completion frequency", () => {
  const completions = {};
  for (let week = 0; week < 12; week += 1) {
    for (let day = 0; day < 4; day += 1) {
      const date = ymd(2026, 8, 3 + week * 7 + day);
      completions[`h1__${toKey(date)}`] = true;
    }
  }

  const stability = computeHabitStability(
    { id: "h1", createdAt: "2026-01-01T09:00:00.000Z" },
    completions,
    ymd(2026, 10, 26),
  );

  assert.deepEqual(stability.weeklyCompletions, Array(12).fill(4));
  assert.equal(stability.variation, 0);
  assert.equal(stability.level, "high");
});

test("habit stability does not label zero activity as high", () => {
  const stability = computeHabitStability(
    { id: "h1", createdAt: "2026-01-01T09:00:00.000Z" },
    {},
    ymd(2026, 10, 26),
  );

  assert.equal(stability.level, "inactive");
  assert.equal(stability.variation, 0);
});

const dailyHabit = { ...baseHabit, id: "h1", createdAt: "2026-01-01T09:00:00.000Z", weeklyTarget: 7 };

const scheduleRow = (habitId, startsOn, weeklyTarget) => ({
  habit_id: habitId,
  starts_on: startsOn,
  weekly_target: weeklyTarget,
});

const completionsFor = (habitId, dates) =>
  buildCompletionMap(
    dates.map((date) => ({ habit_id: habitId, date, completed: true })),
  );

const day = (d) => d < 10 ? `2026-10-0${d}` : `2026-10-${d}`;

test("DAYS_PER_WEEK backs the proportional share", () => {
  assert.equal(DAYS_PER_WEEK, 7);
});

test("weeks run Saturday to Friday and always cover seven days", () => {
  // Oct 1, 2026 is a Thursday: its week starts the Saturday before it.
  const first = getWeek(ymd(Y, 10, 1));
  assert.equal(first.start.getDate(), 26); // Sat Sep 26
  assert.equal(first.start.getMonth(), 8);
  assert.equal(first.end.getDate(), 2); // Fri Oct 2
  assert.equal(getWeekDays(ymd(Y, 10, 1)).length, 7);

  const mid = getWeek(ymd(Y, 10, 15)); // Thursday Oct 15
  assert.equal(mid.start.getDate(), 10);
  assert.equal(mid.end.getDate(), 16);

  // A Saturday on a month boundary anchors its own week across months.
  const boundary = getWeek(ymd(Y, 10, 31)); // Sat Oct 31
  assert.equal(boundary.start.getDate(), 31);
  assert.equal(boundary.end.getDate(), 6); // Fri Nov 6
  assert.equal(boundary.end.getMonth(), 10);
});

test("shiftWeek walks seven days at a time across months and years", () => {
  const next = shiftWeek(ymd(Y, 10, 31), 1); // week Oct 31 - Nov 6
  assert.equal(next.getDate(), 7); // Sat Nov 7
  assert.equal(next.getMonth(), 10);

  const previous = shiftWeek(ymd(Y, 11, 4), -1); // Wed Nov 4
  assert.equal(previous.getDate(), 24); // Sat Oct 24
  assert.equal(previous.getMonth(), 9);

  const previousYear = shiftWeek(ymd(Y, 1, 1), -1); // Thu Jan 1
  assert.equal(previousYear.getFullYear(), Y - 1);
  assert.equal(previousYear.getMonth(), 11); // December
  assert.equal(previousYear.getDate(), 20); // Sat Dec 20, 2025
});

test("consecutive weeks tile the timeline without gaps", () => {
  for (let i = 0; i < 14; i += 1) {
    const day = ymd(Y, 8, 20 + i); // Thu Aug 20 .. Sep 2
    const week = getWeek(day);
    const before = i > 0 ? getWeek(ymd(Y, 8, 19 + i)) : null;

    assert.equal(week.start.getDay(), 6); // Saturday start
    assert.equal(week.end.getDay(), 5); // Friday end
    assert.equal(
      week.end.getTime() - week.start.getTime(),
      6 * 24 * 60 * 60 * 1000,
    );

    if (before) {
      const elapsed =
        (week.start.getTime() - before.start.getTime()) / (24 * 60 * 60 * 1000);
      assert.equal(elapsed, day.getDay() === 6 ? 7 : 0);
    }
  }

  // Crossing a year boundary keeps the Saturday rhythm.
  const yearEnd = getWeek(ymd(Y + 1, 1, 1));
  assert.equal(yearEnd.start.getDate(), 26); // Sat Dec 26, 2026
  assert.equal(yearEnd.start.getMonth(), 11);
  assert.equal(yearEnd.end.getDate(), 1); // Fri Jan 1, 2027
  assert.equal(yearEnd.end.getMonth(), 0);
});

test("week chunks partition a month's days into Sat-Fri intersections", () => {
  const chunks = getWeekChunks(getMonthDays(Y, 9)); // October 2026
  assert.equal(chunks.length, 6); // Sep 26-Oct 2 ... Oct 31-Nov 6
  assert.deepEqual(
    chunks[0].map((d) => d.getDate()),
    [1, 2],
  );
  assert.deepEqual(
    chunks[1].map((d) => d.getDate()),
    [3, 4, 5, 6, 7, 8, 9],
  );
  assert.deepEqual(chunks[5].map((d) => d.getDate()), [31]);

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  assert.equal(total, 31); // every month day belongs to exactly one chunk
});

test("sanitizeWeeklyTarget defaults corrupt values to daily and keeps true zero", () => {
  assert.equal(sanitizeWeeklyTarget(5), 5);
  assert.equal(sanitizeWeeklyTarget("3"), 3);
  assert.equal(sanitizeWeeklyTarget(0), 0); // zero target -> surfaced as N/A
  assert.equal(sanitizeWeeklyTarget(99), 7);
  assert.equal(sanitizeWeeklyTarget(-4), 7);
  assert.equal(sanitizeWeeklyTarget(Number.NaN), 7);
  assert.equal(sanitizeWeeklyTarget(undefined), 7);
});

test("resolveWeeklyTarget replays schedule history per date", () => {
  const habit = { id: "h1", weeklyTarget: 5 };
  const timelines = buildScheduleTimelines([
    scheduleRow("h1", "2026-10-01", 7),
    scheduleRow("h1", "2026-10-21", 5),
  ]);

  assert.equal(resolveWeeklyTarget(habit, timelines, "2026-09-30"), 5); // before history
  assert.equal(resolveWeeklyTarget(habit, timelines, "2026-10-01"), 7);
  assert.equal(resolveWeeklyTarget(habit, timelines, "2026-10-20"), 7);
  assert.equal(resolveWeeklyTarget(habit, timelines, "2026-10-21"), 5); // inclusive start
  assert.equal(resolveWeeklyTarget(habit, timelines, "2026-10-25"), 5);
});

test("resolveWeeklyTarget falls back to the habit target without rows", () => {
  const habit = { id: "h1", weeklyTarget: 3 };
  assert.equal(resolveWeeklyTarget(habit, buildScheduleTimelines([]), "2026-10-01"), 3);
});

test("isHabitEligibleOn trims dates before creation", () => {
  assert.equal(isHabitEligibleOn(baseHabit, ymd(Y, 10, 20)), false);
  assert.equal(isHabitEligibleOn(baseHabit, ymd(Y, 10, 21)), true);
  assert.equal(isHabitEligibleOn(baseHabit, ymd(Y, 10, 25)), true);
});

test("completion map ignores false rows and counts each date once", () => {
  const map = buildCompletionMap([
    { habit_id: "h1", date: "2026-10-19", completed: true },
    { habit_id: "h1", date: "2026-10-19", completed: true }, // duplicate row
    { habit_id: "h1", date: "2026-10-20", completed: false },
  ]);

  assert.equal(map["h1__2026-10-19"], true);
  assert.equal(map["h1__2026-10-20"], undefined);
});

test("current week measures against the full weekly target (in-progress period)", () => {
  const today = ymd(Y, 10, WED);
  const period = getProgressPeriod("week", today, today);

  assert.equal(period.isCurrent, true);
  assert.equal(period.start.getDay(), 6); // weeks start Saturday
  assert.equal(period.start.getDate(), 17); // Sat Oct 17
  assert.equal(period.end.getDay(), 5); // and end Friday
  assert.equal(period.end.getDate(), 23); // Fri Oct 23
  assert.equal(period.totalDays, 7);
  assert.equal(period.effectiveEnd.getDate(), WED);

  // Distributed over the full 7 days for a "5 days per week" habit => 5.
  const metric = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 5)]),
    completionsFor("h1", [day(MON), day(TUE), day(WED)]),
    period,
  );

  assert.equal(metric.completed, 3);
  assert.ok(Math.abs(metric.target - 5) < 1e-9);
  assert.ok(Math.abs(metric.percentage - 60) < 1e-6);
  assert.equal(metric.level.label, "Advanced");
});

test("daily habits resolve against seven target days", () => {
  const today = ymd(Y, 10, WED);
  const period = getProgressPeriod("week", today, today);

  const metric = computeHabitPeriodMetric(
    dailyHabit,
    buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 7)]),
    completionsFor("h1", [day(MON), day(TUE), day(WED)]),
    period,
  );

  assert.equal(metric.completed, 3);
  assert.equal(metric.target, 7);
  assert.ok(Math.abs(metric.percentage - (3 / 7) * 100) < 1e-6);
  assert.equal(metric.level.label, "Intermediate");
});

test("mid-week target changes are replayed from schedule history", () => {
  const today = ymd(Y, 10, WED);
  const period = getProgressPeriod("week", today, today);

  // Week Oct 17-23: 7 until Oct 20 inclusive, 5 from Oct 21.
  const metric = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([
      scheduleRow("h1", "2026-01-01", 7),
      scheduleRow("h1", "2026-10-21", 5),
    ]),
    completionsFor("h1", [day(MON), day(TUE), day(WED)]),
    period,
  );

  assert.equal(metric.completed, 3);
  assert.ok(Math.abs(metric.target - (4 + 15 / 7)) < 1e-9);
  assert.ok(
    Math.abs(metric.percentage - (3 / (4 + 15 / 7)) * 100) < 1e-6,
  );
  assert.equal(metric.level.label, "Intermediate");
});

test("monthly target is proportional to eligible calendar days", () => {
  const today = ymd(Y, 11, SUN); // Nov 2026 keeps October fully in the past
  const month = getProgressPeriod("month", ymd(Y, 10, 15), today);

  assert.equal(month.totalDays, 31);
  assert.equal(month.isCurrent, false);

  const fullMonth = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-09-01T09:00:00.000Z" },
    buildScheduleTimelines([scheduleRow("h1", "2026-09-01", 5)]),
    completionsFor("h1", ["2026-10-01", "2026-10-02"]),
    month,
  );
  const expectedFull = (5 / 7) * 31;
  assert.ok(Math.abs(fullMonth.target - expectedFull) < 1e-9);
  assert.equal(fullMonth.completed, 2);
  assert.ok(Math.abs(fullMonth.percentage - (2 / expectedFull) * 100) < 1e-6);
});

test("creation date trims the monthly target", () => {
  const today = ymd(Y, 11, SUN);
  const month = getProgressPeriod("month", ymd(Y, 10, 15), today);

  // Created Oct 21 -> eligible days Oct 21..31 (11 days), share 5/7 each.
  const metric = computeHabitPeriodMetric(
    baseHabit,
    buildScheduleTimelines([scheduleRow("h1", "2026-10-21", 5)]),
    completionsFor("h1", ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]),
    month,
  );

  const expectedTarget = (5 / 7) * 11;
  assert.equal(metric.completed, 5);
  assert.ok(Math.abs(metric.target - expectedTarget) < 1e-9);
  assert.ok(Math.abs(metric.percentage - (5 / expectedTarget) * 100) < 1e-6);
  assert.equal(metric.level.label, "Advanced");
});

test("a new target mid-month applies only from its start date", () => {
  const today = ymd(Y, 11, SUN);
  const month = getProgressPeriod("month", ymd(Y, 10, 15), today);

  const metric = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([
      scheduleRow("h1", "2026-01-01", 7),
      scheduleRow("h1", "2026-10-21", 5),
    ]),
    completionsFor("h1", ["2026-10-20", "2026-10-21"]),
    month,
  );

  // Days 1..20 at share 1 (target 7) + days 21..31 at 5/7.
  const expectedTarget = 20 + (5 / 7) * 11;
  assert.equal(metric.completed, 2);
  assert.ok(Math.abs(metric.target - expectedTarget) < 1e-9);
});

test("overachievement exceeds 100 percent and maps to the top level", () => {
  // A completed Sat-Fri week: Oct 10-16, 2026 (Nov 1 is after it ends).
  const week = getProgressPeriod("week", ymd(Y, 10, 12), ymd(Y, 11, 1));

  const metric = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 5)]),
    completionsFor("h1", [
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
    ]),
    week,
  );

  assert.equal(metric.completed, 7);
  assert.equal(metric.target, 5);
  assert.ok(Math.abs(metric.percentage - 140) < 1e-6);
  assert.equal(metric.level.label, "Legendary");
});

test("future periods and zero targets render as N/A", () => {
  const today = ymd(Y, 10, WED);
  const futureWeek = getProgressPeriod("week", ymd(Y, 11, 5), today);
  assert.equal(futureWeek.isFuture, true);

  const future = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 5)]),
    completionsFor("h1", []),
    futureWeek,
  );
  assert.deepEqual(future, { completed: 0, target: 0, percentage: null, level: null });

  const zeroTargetWeek = getProgressPeriod("week", ymd(Y, 9, 28), today);
  const zero = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 0)]),
    completionsFor("h1", ["2026-09-28"]),
    zeroTargetWeek,
  );
  assert.equal(zero.completed, 1);
  assert.equal(zero.target, 0);
  assert.equal(zero.percentage, null);
  assert.equal(zero.level, null);

  // A habit created inside the current period has no target for a week that
  // ended before its creation date.
  const beforeCreation = computeHabitPeriodMetric(
    baseHabit,
    buildScheduleTimelines([]),
    completionsFor("h1", []),
    getProgressPeriod("week", ymd(Y, 9, 28), today),
  );
  // Week Sep 26 - Oct 2; created Oct 21 -> the whole week predates creation,
  // so the target sums to zero.
  assert.equal(beforeCreation.target, 0);
  assert.equal(beforeCreation.percentage, null);
});

test("getPreviousProgressPeriod keeps full length and zero stays N/A for future", () => {
  const today = ymd(Y, 10, WED);
  const current = getProgressPeriod("week", today, today);
  const previous = getPreviousProgressPeriod(current);

  assert.equal(previous.start.getDate(), 10); // Week Oct 10-16
  assert.equal(previous.end.getDate(), 16);
  assert.equal(previous.elapsedDays, 7);
  assert.equal(previous.isCurrent, false);

  const future = getProgressPeriod("week", ymd(Y, 11, 5), today);
  assert.equal(getPreviousProgressPeriod(future).elapsedDays, 0);
});

test("previous progress periods also compare completed counts", () => {
  const today = ymd(Y, 10, WED + 1); // Thursday, still within the same week
  const period = getProgressPeriod("week", today, today);
  const previous = getPreviousProgressPeriod(period);
  const timelines = buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 5)]);
  const habit = { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" };

  const metric = computeHabitPeriodMetric(
    habit,
    timelines,
    completionsFor("h1", ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]),
    previous,
  );

  assert.equal(metric.completed, 4);
  assert.equal(metric.target, 5);
  assert.ok(Math.abs(metric.percentage - 80) < 1e-6);
});

test("compareMetrics reports percentage and completed deltas with N/A rules", () => {
  const comparison = compareMetrics(
    { completed: 4, target: 5, percentage: 80, level: { rank: 3 } },
    { completed: 7, target: 5, percentage: 140, level: { rank: 4 } },
  );

  assert.ok(Math.abs(comparison.percentageDelta + 60) < 1e-6);
  assert.equal(comparison.completedDelta, -3);
  assert.equal(comparison.trend, "down");
  assert.equal(comparison.completedTrend, "down");
  assert.equal(comparison.levelTrend, "down");

  const na = compareMetrics(
    { completed: 0, target: 0, percentage: null, level: null },
    { completed: 3, target: 5, percentage: 60, level: { rank: 2 } },
  );
  assert.equal(na.percentageDelta, null);
  assert.equal(na.completedDelta, null);
  assert.equal(na.trend, "na");
  assert.equal(na.completedTrend, "na");
});

test("summarizeMetrics pools habits including fractional targets", () => {
  const summary = summarizeMetrics([
    { completed: 3, target: 5, percentage: 60, level: { rank: 2 } },
    { completed: 5, target: (5 / 7) * 11, percentage: 63.6, level: { rank: 3 } },
  ]);

  assert.equal(summary.completed, 8);
  assert.ok(Math.abs(summary.target - (5 + (5 / 7) * 11)) < 1e-9);
  assert.ok(Math.abs(summary.percentage - (8 / (5 + (5 / 7) * 11)) * 100) < 1e-6);
});

test("formatTargetCount shows whole numbers and one decimal", () => {
  assert.equal(formatTargetCount(31), "31");
  assert.equal(formatTargetCount((5 / 7) * 31), "22.1");
  assert.equal(formatTargetCount((5 / 7) * 11), "7.9");
});

test("calendar range rate weights habits by their weekly targets", () => {
  const days = [ymd(Y, 10, 24), ymd(Y, 10, 25)];
  const daily = { ...baseHabit, id: "daily", createdAt: "2026-01-01T09:00:00.000Z", weeklyTarget: 7 };
  const weekly = { ...baseHabit, id: "weekly", createdAt: "2026-01-01T09:00:00.000Z", weeklyTarget: 5 };
  const timelines = buildScheduleTimelines([
    scheduleRow("daily", "2026-01-01", 7),
    scheduleRow("weekly", "2026-01-01", 5),
  ]);
  const completions = buildCompletionMap([
    { habit_id: "daily", date: "2026-10-24", completed: true },
    { habit_id: "daily", date: "2026-10-25", completed: true },
    { habit_id: "weekly", date: "2026-10-24", completed: true },
    { habit_id: "weekly", date: "2026-10-25", completed: false }, // ignored
  ]);

  const rate = computeRangeRate([daily, weekly], timelines, completions, days);
  assert.equal(rate.completed, 3);
  assert.ok(Math.abs(rate.target - (2 + (5 / 7) * 2)) < 1e-9);
  assert.ok(Math.abs(rate.percentage - 87.5) < 1e-6);
});

test("calendar range rate trims days before a habit existed", () => {
  const days = [ymd(Y, 10, 21), ymd(Y, 10, 22), ymd(Y, 10, 23), ymd(Y, 10, 24), ymd(Y, 10, 25)];
  const habit = { ...baseHabit, createdAt: "2026-10-24T09:00:00.000Z" }; // created in range
  const completions = buildCompletionMap([
    { habit_id: "h1", date: "2026-10-21", completed: true }, // before creation: ignored
    { habit_id: "h1", date: "2026-10-24", completed: true },
  ]);

  const rate = computeRangeRate(
    [habit],
    buildScheduleTimelines([scheduleRow("h1", "2026-10-24", 5)]),
    completions,
    days,
  );

  assert.equal(rate.completed, 1); // pre-creation row never inflates the count
  assert.ok(Math.abs(rate.target - (5 / 7) * 2) < 1e-9); // only Oct 24-25 are eligible
  assert.ok(Math.abs(rate.percentage - 70) < 1e-6);
});

test("calendar range rate replays schedule history and allows overachievement", () => {
  const days = [ymd(Y, 10, 21), ymd(Y, 10, 22), ymd(Y, 10, 23), ymd(Y, 10, 24), ymd(Y, 10, 25)];
  const habit = { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" };
  const timelines = buildScheduleTimelines([
    scheduleRow("h1", "2026-01-01", 7),
    scheduleRow("h1", "2026-10-24", 5),
  ]);
  const completions = completionsFor("h1", [day(21), day(22), day(23), day(24), day(25)]);

  const rate = computeRangeRate([habit], timelines, completions, days);

  // Oct 21-23 at share 1, Oct 24-25 at 5/7.
  assert.equal(rate.completed, 5);
  assert.ok(Math.abs(rate.target - (3 + (5 / 7) * 2)) < 1e-9);
  assert.ok(Math.abs(rate.percentage - (35 / 31) * 100) < 1e-6);
  assert.ok(rate.percentage > 100);
});

test("calendar range rate is N/A for an empty range", () => {
  const rate = computeRangeRate(
    [{ ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" }],
    buildScheduleTimelines([]),
    buildCompletionMap([]),
    [],
  );
  assert.deepEqual(rate, { completed: 0, target: 0, percentage: null });
});

test("achievement thresholds are preserved", async () => {
  const { ACHIEVEMENT_LEVELS, getLevel } = await import("../src/lib/date.ts");

  assert.deepEqual(
    ACHIEVEMENT_LEVELS.map((l) => [l.minScore, l.rank]),
    [[90, 4], [75, 3], [60, 2], [40, 1], [0, 0]],
  );

  assert.equal(getLevel(89.999).label, "Elite");
  assert.equal(getLevel(90).label, "Legendary");
  assert.equal(getLevel(75).label, "Elite");
  assert.equal(getLevel(60).label, "Advanced");
  assert.equal(getLevel(40).label, "Intermediate");
  assert.equal(getLevel(0).label, "Beginner");
  assert.equal(getLevel(140).label, "Legendary"); // overachievement
});

test("done counter shows the scheduled share next to the completed count", () => {
  // A full 7-day week for a "5 days per week" habit: 7 across 5 -> complete.
  const week = doneCounterFrom({ completed: 7, target: 5, percentage: 140 });
  assert.deepEqual(week, { completed: 7, scheduled: 5, complete: true });
  // Blends across a mid-week target change round to whole days, and the
  // green coverage check uses that same rounded number.
  //   5 days at the old 5/7 + 2 days at the new 7/7 = 5.57 -> "6".
  const blend = 5 * (5 / 7) + 2;
  assert.equal(doneCounterFrom({ completed: 5, target: blend, percentage: (5 / blend) * 100 }).complete, false);
  assert.equal(
    doneCounterFrom({ completed: 5, target: blend, percentage: (5 / blend) * 100 })
      .scheduled,
    6,
  );
  assert.equal(
    doneCounterFrom({ completed: 6, target: blend, percentage: (6 / blend) * 100 })
      .complete,
    true,
  );

  // A month's share (5/7 x 31 = 22.14) rounds to 22 and 22 days cover it.
  const share = (5 / 7) * 31;
  const month = doneCounterFrom({
    completed: 22,
    target: share,
    percentage: (22 / share) * 100,
  });
  assert.equal(month.scheduled, 22);
  assert.equal(month.complete, true);

  // Nothing scheduled (zero target): the denominator is hidden entirely.
  const empty = doneCounterFrom({ completed: 3, target: 0, percentage: null });
  assert.deepEqual(empty, { completed: 3, scheduled: null, complete: false });

  // A sub-half-day share (e.g. 3 eligible days of a 1-day/week habit)
  // cannot promise a full scheduled day, so it hides the denominator too.
  const tinyShare = 3 * (1 / 7); // 0.43
  assert.equal(
    doneCounterFrom({ completed: 3, target: tinyShare, percentage: 100 })
      .scheduled,
    null,
  );
});

test("done counter treats float rounding artifacts as whole goals", () => {
  // 7*(5/7)-style sums can land a hair over the integer target; rounding
  // pulls them back to the whole scheduled count and stays complete.
  const rate = {
    completed: 7,
    target: 5 + 1e-12,
    percentage: (7 / (5 + 1e-12)) * 100, // 99.99999999999998 < 100
  };
  assert.equal(doneCounterFrom(rate).scheduled, 5);
  assert.equal(doneCounterFrom(rate).complete, true);

  // ...but genuinely-not-complete rates stay untouched.
  assert.equal(
    doneCounterFrom({ completed: 9999, target: 10000, percentage: 99.99 })
      .complete,
    false,
  );
});

test("done counter can use the habit's exact weekly target in week view", () => {
  // Week view pins the denominator to the habit's current weekly target,
  // so a blend from a mid-week target change no longer shows 5.6/6.3.
  // Here the share over the Sat-Fri week is 5.57 (5 old days + 2 new),
  // but the cell shows the current exact target.
  const blendWeek = 5 * (5 / 7) + 2; // 5.5714285...
  const pinned = doneCounterFrom(
    { completed: 4, target: blendWeek, percentage: (4 / blendWeek) * 100 },
    7,
  );
  assert.deepEqual(pinned, { completed: 4, scheduled: 7, complete: false });
  assert.equal(
    doneCounterFrom(
      { completed: 7, target: blendWeek, percentage: (7 / blendWeek) * 100 },
      7,
    ).complete,
    true,
  );

  // Zero-target habits stay hidden even when pinned.
  const zero = doneCounterFrom(
    { completed: 2, target: 2, percentage: 100 },
    0,
  );
  assert.deepEqual(zero, { completed: 2, scheduled: null, complete: false });

  // Without an override (month / last 15), the rounded share wins.
  const range = 5 * (5 / 7) + 9; // 15-day window: 5 days at 5/7, then daily
  assert.equal(
    doneCounterFrom({ completed: 11, target: range, percentage: (11 / range) * 100 })
      .scheduled,
    13, // 5*(5/7)+9 = 12.57 -> 13
  );
});

test("calendar counters use the current target for month and 15-day views", () => {
  // Regression: a habit that moved from daily to 5x/week on Oct 26 must not
  // blend the old daily history into the month / 15-day denominator. The
  // calendar counter is a glance at the current routine, so it pins the
  // habit's current weekly target just like the week view already did.
  const habit = {
    ...baseHabit,
    weeklyTarget: 5,
    createdAt: "2026-09-01T09:00:00.000Z",
  };
  const october = getMonthDays(Y, 9); // 31 days
  const monthScheduled = scheduledDaysForRange(habit, october);
  assert.ok(Math.abs(monthScheduled - (5 / 7) * 31) < 1e-9);
  assert.equal(
    doneCounterFrom({
      completed: 8,
      target: monthScheduled,
      percentage: (8 / monthScheduled) * 100,
    }).scheduled,
    22, // 22.14 -> 22, not the history blend of 29
  );

  const last15 = Array.from({ length: 15 }, (_, index) =>
    ymd(Y, 10, 16 + index),
  );
  const last15Scheduled = scheduledDaysForRange(habit, last15);
  assert.ok(Math.abs(last15Scheduled - (5 / 7) * 15) < 1e-9);
  assert.equal(
    doneCounterFrom({
      completed: 8,
      target: last15Scheduled,
      percentage: (8 / last15Scheduled) * 100,
    }).scheduled,
    11, // 10.71 -> 11, not the history blend of 14
  );

  // Creation dates still trim the scheduled share: a habit created Oct 21
  // only has 11 eligible days in October.
  const created = { ...habit, createdAt: "2026-10-21T09:00:00.000Z" };
  const trimmed = scheduledDaysForRange(created, october);
  assert.ok(Math.abs(trimmed - (5 / 7) * 11) < 1e-9);
  assert.equal(
    doneCounterFrom({ completed: 5, target: trimmed, percentage: 63.6 })
      .scheduled,
    8, // 7.86 -> 8
  );

  // A habit that did not exist in the range schedules nothing at all.
  const future = scheduledDaysForRange(
    { ...habit, createdAt: "2026-11-15T09:00:00.000Z" },
    october,
  );
  assert.equal(future, 0);
  assert.equal(
    doneCounterFrom({ completed: 0, target: future, percentage: null })
      .scheduled,
    null,
  );
});
