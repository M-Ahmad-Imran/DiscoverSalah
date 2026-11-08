import { test } from "node:test";
import assert from "node:assert/strict";
import { runScheduled } from "../src/workers/scheduled.js";
import { workerConfig } from "../src/config/env.js";

test("empty queues finish after one pass", async () => {
  let calls = 0;
  const empty = async () => {
    calls++;
    return 0;
  };
  const result = await runScheduled({
    notifications: empty,
    images: empty,
    retention: empty,
  });
  assert.equal(calls, 3);
  assert.equal(result.limited, false);
});
test("busy queues are bounded and each maintenance type gets a turn", async () => {
  const result = await runScheduled({
    notifications: async () => 1,
    images: async () => 1,
    retention: async () => 100,
  });
  assert.deepEqual(result.counts, {
    notifications: 200,
    images: 50,
    retention: 500,
  });
  assert.equal(result.limited, true);
});
test("one queue failure does not prevent other maintenance", async () => {
  let images = 0;
  const result = await runScheduled({
    notifications: async () => {
      throw Error("failure");
    },
    images: async () => {
      images++;
      return 0;
    },
    retention: async () => 0,
  });
  assert.equal(result.failures, 1);
  assert.equal(images, 1);
});
test("deadline and termination stop taking more work", async () => {
  let clock = 0;
  const task = async () => {
    clock += 100;
    return 1;
  };
  const result = await runScheduled(
    { notifications: task, images: task, retention: task },
    { now: () => clock, durationMs: 150 },
  );
  assert.deepEqual(result.counts, {
    notifications: 1,
    images: 1,
    retention: 0,
  });
  assert.equal(result.limited, true);
  const stopped = await runScheduled(
    { notifications: task, images: task, retention: task },
    { stopped: () => true },
  );
  assert.equal(stopped.counts.notifications, 0);
});
test("worker needs no API encryption keys and rejects partial media credentials", () => {
  assert.equal(
    workerConfig({ MONGODB_URI: "mongodb://localhost", DB_NAME: "test" })
      .DB_NAME,
    "test",
  );
  assert.throws(() =>
    workerConfig({
      MONGODB_URI: "mongodb://localhost",
      CLOUDINARY_API_KEY: "partial",
    }),
  );
});
