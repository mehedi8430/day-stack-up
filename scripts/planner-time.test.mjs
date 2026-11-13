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

const { formatPlannerTime, parsePlannerTime } = await import(
  "../src/lib/planner-utils.ts"
);

test("planner time round-trips as wall-clock time", () => {
  const value = parsePlannerTime("07:30");

  assert.ok(value);
  assert.equal(value.toISOString(), "1970-01-01T07:30:00.000Z");
  assert.equal(formatPlannerTime(value), "07:30");
});

test("planner time keeps midnight as 00:00", () => {
  const value = parsePlannerTime("00:00");

  assert.ok(value);
  assert.equal(value.toISOString(), "1970-01-01T00:00:00.000Z");
  assert.equal(formatPlannerTime(value), "00:00");
});

test("planner time rejects malformed values", () => {
  assert.equal(parsePlannerTime("24:00"), null);
  assert.equal(parsePlannerTime("9:00"), null);
  assert.equal(parsePlannerTime("09:60"), null);
  assert.equal(parsePlannerTime(""), null);
});
