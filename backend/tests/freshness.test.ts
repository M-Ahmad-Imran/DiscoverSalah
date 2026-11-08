import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, freshness } from "../src/modules/schedules/freshness.js";
import type { Venue } from "../src/db/models.js";
test("confirmation reminder starts at 7 days, focal follow-up at 14 days", () => {
  const start = new Date("2026-11-01T00:00:00Z");
  const venue = { createdAt: start, reconfirmedAt: start } as Venue;
  assert.equal(
    freshness(venue, new Date(+start + 7 * DAY - 1)).status,
    "Current",
  );
  assert.equal(
    freshness(venue, new Date(+start + 7 * DAY)).status,
    "Confirmation due",
  );
  assert.equal(
    freshness(venue, new Date(+start + 14 * DAY)).status,
    "Follow-up needed",
  );
});
test("follow-up and future publication do not reset representative confirmation", () => {
  const start = new Date("2026-11-01T00:00:00Z"),
    now = new Date(+start + 15 * DAY);
  const venue = {
    createdAt: start,
    identityApprovedAt: start,
    lastFollowUpAt: now,
    timetablePublishedAt: now,
  } as Venue;
  assert.equal(freshness(venue, now).status, "Follow-up needed");
  venue.reconfirmedAt = now;
  assert.equal(freshness(venue, now).status, "Current");
});
