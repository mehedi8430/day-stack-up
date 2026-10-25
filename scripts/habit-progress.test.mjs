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
  formatTargetCount,
  getPreviousProgressPeriod,
  getProgressPeriod,
  resolveWeeklyTarget,
  sanitizeWeeklyTarget,
  summarizeMetrics,
  isHabitEligibleOn,
} = await import("../src/lib/habit-progress.ts");

// Local-noon dates keep every assertion independent of the test machine's
// timezone: noon is far from any midnight boundary in every real zone.
const ymd = (year, month, day) => new Date(year, month - 1, day, 12);
const Y = 2026; // test year
// Monday 2026-10-19 through Sunday 2026-10-25 (current week in the tests).
const MON = 19, TUE = 20, WED = 21, SUN = 25;

const baseHabit = {
  id: "h1",
  name: "Exercise",
  category: "fitness",
  createdAt: "2026-10-21T09:00:00.000Z",
  weeklyTarget: 5,
};

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

  // 7 until Oct 20 inclusive, 5 from Oct 21: shares 2*1 + 5*(5/7).
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
  assert.ok(Math.abs(metric.target - (2 + (5 / 7) * 5)) < 1e-9);
  assert.ok(Math.abs(metric.percentage - (3 / (2 + (5 / 7) * 5)) * 100) < 1e-6);
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
  const today = ymd(Y, 10, SUN);
  const week = getProgressPeriod("week", today, today);

  const metric = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 5)]),
    completionsFor("h1", [
      day(MON), day(TUE), day(WED), "2026-10-22", "2026-10-23", "2026-10-24", day(SUN),
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
  // Week Sep 28 - Oct 4; created Oct 21 -> only days before creation remain,
  // target sums to zero.
  assert.equal(beforeCreation.target, 0);
  assert.equal(beforeCreation.percentage, null);
});

test("getPreviousProgressPeriod keeps full length and zero stays N/A for future", () => {
  const today = ymd(Y, 10, WED);
  const current = getProgressPeriod("week", today, today);
  const previous = getPreviousProgressPeriod(current);

  assert.equal(previous.start.getDate(), 12); // Monday Oct 12
  assert.equal(previous.end.getDate(), 18);
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
