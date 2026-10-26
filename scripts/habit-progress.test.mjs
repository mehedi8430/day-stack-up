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
  computeHabitStability,
  computeHabitPeriodMetric,
  computeRangeRate,
  formatTargetCount,
  getPreviousProgressPeriod,
  getProgressPeriod,
  resolveWeeklyTarget,
  sanitizeWeeklyTarget,
  summarizeMetrics,
  isHabitEligibleOn,
} = await import("../src/lib/habit-progress.ts");

const { getMonthWeek, getMonthWeekDays, shiftMonthWeek, toKey } = await import(
  "../src/lib/date.ts"
);

// Local-noon dates keep every assertion independent of the test machine's
// timezone: noon is far from any midnight boundary in every real zone.
const ymd = (year, month, day) => new Date(year, month - 1, day, 12);
const Y = 2026; // test year
// Current month-anchored week in the tests: Oct 15-21, 2026.
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
  assert.deepEqual(stability.weeklyCompletions.slice(-2), [4, 6]);
  assert.equal(stability.min, 0);
  assert.equal(stability.max, 6);
  assert.equal(stability.variation, 6);
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

test("month-anchored weeks start on the 1st and end at month end", () => {
  const first = getMonthWeek(ymd(Y, 10, 1));
  assert.equal(first.start.getDate(), 1);
  assert.equal(first.end.getDate(), 7);
  assert.equal(first.index, 1);
  assert.equal(first.count, 5);

  const fourth = getMonthWeek(ymd(Y, 10, 26));
  assert.equal(fourth.start.getDate(), 22);
  assert.equal(fourth.end.getDate(), 28);
  assert.equal(fourth.index, 4);

  const last = getMonthWeek(ymd(Y, 10, 29));
  assert.equal(last.start.getDate(), 29);
  assert.equal(last.end.getDate(), 31);
  assert.equal(last.index, 5);
  assert.equal(getMonthWeekDays(ymd(Y, 10, 29)).length, 3);

  const feb = getMonthWeek(ymd(Y, 2, 22));
  assert.equal(feb.count, 4);
  assert.equal(feb.end.getDate(), 28);
});

test("shiftMonthWeek crosses months without skipping short weeks", () => {
  const nextMonth = shiftMonthWeek(ymd(Y, 10, 29), 1);
  assert.equal(nextMonth.getMonth(), 10); // November
  assert.equal(nextMonth.getDate(), 1);

  const previousMonth = shiftMonthWeek(ymd(Y, 11, 1), -1);
  assert.equal(previousMonth.getMonth(), 9); // October
  assert.equal(previousMonth.getDate(), 29);

  const march = shiftMonthWeek(ymd(Y, 2, 22), 1);
  assert.equal(march.getMonth(), 2); // March
  assert.equal(march.getDate(), 1);

  const february = shiftMonthWeek(ymd(Y, 3, 1), -1);
  assert.equal(february.getMonth(), 1); // February
  assert.equal(february.getDate(), 22);

  const previousYear = shiftMonthWeek(ymd(Y, 1, 1), -1);
  assert.equal(previousYear.getFullYear(), Y - 1);
  assert.equal(previousYear.getMonth(), 11); // December
  assert.equal(previousYear.getDate(), 29);
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

  // Week Oct 15-21: 7 until Oct 20 inclusive, 5 from Oct 21.
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
  assert.ok(Math.abs(metric.target - (6 + 5 / 7)) < 1e-9);
  assert.ok(Math.abs(metric.percentage - (3 / (6 + 5 / 7)) * 100) < 1e-6);
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
  // A completed month-anchored week: Oct 22-28, 2026.
  const week = getProgressPeriod("week", ymd(Y, 10, 22), ymd(Y, 11, 1));

  const metric = computeHabitPeriodMetric(
    { ...baseHabit, createdAt: "2026-01-01T09:00:00.000Z" },
    buildScheduleTimelines([scheduleRow("h1", "2026-01-01", 5)]),
    completionsFor("h1", [
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
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
  // Week Sep 22-28; created Oct 21 -> the whole week predates creation,
  // so the target sums to zero.
  assert.equal(beforeCreation.target, 0);
  assert.equal(beforeCreation.percentage, null);
});

test("getPreviousProgressPeriod keeps full length and zero stays N/A for future", () => {
  const today = ymd(Y, 10, WED);
  const current = getProgressPeriod("week", today, today);
  const previous = getPreviousProgressPeriod(current);

  assert.equal(previous.start.getDate(), 8); // Week Oct 8-14
  assert.equal(previous.end.getDate(), 14);
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
    completionsFor("h1", ["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]),
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
