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

const {
  DEFAULT_WORK_GOALS,
  getWeeklyWorkTargetMinutes,
  isQualifyingWorkday,
  parseWorkGoalSettings,
  SETTING_KEYS,
} = await import("../src/lib/settings.ts");

test("work goals default to eight hours and five qualifying days", () => {
  assert.deepEqual(DEFAULT_WORK_GOALS, {
    dailyTargetMinutes: 480,
    workdaysPerWeek: 5,
  });
});

test("work goal setting key is namespaced for future settings", () => {
  assert.equal(SETTING_KEYS.workGoals, "work-goals");
});

test("parses valid quarter-hour targets and workday counts", () => {
  assert.deepEqual(
    parseWorkGoalSettings({
      dailyTargetMinutes: 450,
      workdaysPerWeek: 4,
    }),
    {
      dailyTargetMinutes: 450,
      workdaysPerWeek: 4,
    },
  );
});

test("derives weekly hours from the daily goal and qualifying-day target", () => {
  const settings = {
    dailyTargetMinutes: 450,
    workdaysPerWeek: 4,
  };

  assert.equal(getWeeklyWorkTargetMinutes(settings), 1800);
  assert.equal(isQualifyingWorkday(449, settings), false);
  assert.equal(isQualifyingWorkday(450, settings), true);
});

test("rejects malformed or out-of-range work goals", () => {
  for (const value of [
    null,
    [],
    { dailyTargetMinutes: 0, workdaysPerWeek: 5 },
    { dailyTargetMinutes: 481, workdaysPerWeek: 5 },
    { dailyTargetMinutes: 1500, workdaysPerWeek: 5 },
    { dailyTargetMinutes: 480, workdaysPerWeek: 0 },
    { dailyTargetMinutes: 480, workdaysPerWeek: 8 },
    { dailyTargetMinutes: 480.5, workdaysPerWeek: 5 },
  ]) {
    assert.equal(parseWorkGoalSettings(value), null);
  }
});
