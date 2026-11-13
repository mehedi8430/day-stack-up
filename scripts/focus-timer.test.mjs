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

const { formatFocusElapsed, getElapsedSeconds, getTrackedMinuteSync } =
  await import("../src/lib/focus-timer.ts");

test("running elapsed adds the current segment", () => {
  const session = {
    status: "running",
    accumulatedSeconds: 90,
    segmentStartedAt: "2026-11-13T10:00:00.000Z",
  };

  assert.equal(
    getElapsedSeconds(session, Date.parse("2026-11-13T10:01:00.000Z")),
    150,
  );
});

test("paused and completed sessions ignore the clock", () => {
  const session = {
    status: "paused",
    accumulatedSeconds: 90,
    segmentStartedAt: null,
  };

  assert.equal(getElapsedSeconds(session, Date.now()), 90);
  assert.equal(
    getElapsedSeconds({ ...session, status: "completed" }, Date.now()),
    90,
  );
});

test("elapsed never goes negative on clock skew", () => {
  const session = {
    status: "running",
    accumulatedSeconds: 10,
    segmentStartedAt: "2026-11-13T10:01:00.000Z",
  };

  assert.equal(
    getElapsedSeconds(session, Date.parse("2026-11-13T10:00:00.000Z")),
    10,
  );
});

test("formats focus time as minutes or hours", () => {
  assert.equal(formatFocusElapsed(0), "00:00");
  assert.equal(formatFocusElapsed(65), "01:05");
  assert.equal(formatFocusElapsed(3600), "1:00:00");
  assert.equal(formatFocusElapsed(3661), "1:01:01");
  assert.equal(formatFocusElapsed(-1), "00:00");
});

test("only whole unreported minutes are synced", () => {
  assert.deepEqual(getTrackedMinuteSync(0, 59), {
    minutes: 0,
    reportedSeconds: 0,
  });
  assert.deepEqual(getTrackedMinuteSync(0, 90), {
    minutes: 1,
    reportedSeconds: 60,
  });
  assert.deepEqual(getTrackedMinuteSync(60, 119), {
    minutes: 0,
    reportedSeconds: 60,
  });
  assert.deepEqual(getTrackedMinuteSync(60, 190), {
    minutes: 2,
    reportedSeconds: 180,
  });
  assert.deepEqual(getTrackedMinuteSync(60, 59), {
    minutes: 0,
    reportedSeconds: 60,
  });
});
