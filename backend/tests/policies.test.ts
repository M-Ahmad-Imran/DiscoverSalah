import test from "node:test";
import assert from "node:assert/strict";
import { sessions, affected } from "../src/modules/schedules/policy.js";
import { phone, date } from "../src/lib/validation.js";
import {
  hashPassword,
  verifyPassword,
  encrypt,
  decrypt,
} from "../src/lib/crypto.js";
import { reviews } from "../src/modules/venues/policies.js";
import type { Snapshot, Proposal, Account, Venue } from "../src/db/models.js";
const s: Snapshot = {
  times: {
    Fajr: "05:20",
    Dhuhr: "13:30",
    Asr: "16:15",
    Maghrib: "17:40",
    Isha: "19:15",
  },
  special: [],
  effective: "2026-01-01",
  reason: "Test baseline",
};
test("canceled dated prayer cannot fall back to recurrence", () => {
  assert.equal(
    sessions(
      {
        ...s,
        special: [
          {
            id: "a",
            prayer: "Asr",
            date: "2026-10-20",
            time: "16:15",
            khutbah: "",
            provisional: false,
            canceled: true,
          },
        ],
      },
      "Asr",
      "2026-10-20",
    ).length,
    0,
  );
});
test("Friday does not invent ordinary Dhuhr or repeat last weeks Jumu\u2019ah", () => {
  assert.equal(sessions(s, "Dhuhr", "2026-10-23").length, 0);
  assert.equal(
    sessions(
      {
        ...s,
        special: [
          {
            id: "fri",
            prayer: "Jumu\u2019ah",
            date: "2026-10-16",
            time: "13:30",
            khutbah: "13:00",
            provisional: false,
            canceled: false,
          },
        ],
      },
      "Jumu\u2019ah",
      "2026-10-23",
    ).length,
    0,
  );
});
test("pending changes affect only changed prayer and effective dates", () => {
  const p = {
    state: "Submitted",
    before: s,
    snapshot: {
      ...s,
      effective: "2026-10-20",
      times: { ...s.times, Asr: "16:30" },
    },
  } as Proposal;
  assert.equal(affected(p, "Asr", "2026-10-19"), false);
  assert.equal(affected(p, "Asr", "2026-10-20"), true);
  assert.equal(affected(p, "Maghrib", "2026-10-20"), false);
});
test("calendar and contact normalization reject malformed data", () => {
  assert.equal(date.safeParse("2026-02-30").success, false);
  assert.equal(phone.parse("+1 202 555 0101"), "+12025550101");
  assert.equal(phone.safeParse("not a phone").success, false);
});
test("passwords are salted and encryption rejects tampering", async () => {
  const a = await hashPassword("long synthetic password"),
    b = await hashPassword("long synthetic password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("long synthetic password", a), true);
  assert.equal(await verifyPassword("wrong password", a), false);
  const key = "ab".repeat(32),
    cipher = encrypt("private", key);
  assert.equal(decrypt(cipher, key), "private");
  assert.throws(() => decrypt(cipher.slice(0, -3) + "XYZ", key));
});
test("backup expires at its exact end and cannot grant representative review", () => {
  const a = { _id: "backup", role: "focal", active: true } as Account,
    v = {
      repId: "rep",
      focalId: "focal",
      backup: {
        reviewerId: "backup",
        startsAt: new Date("2026-10-20T00:00:00Z"),
        endsAt: new Date("2026-10-20T01:00:00Z"),
      },
    } as Venue;
  assert.equal(reviews(a, v, new Date("2026-10-20T00:59:59Z")), true);
  assert.equal(reviews(a, v, new Date("2026-10-20T01:00:00Z")), false);
  assert.equal(
    reviews(
      { ...a, role: "representative" },
      v,
      new Date("2026-10-20T00:30:00Z"),
    ),
    false,
  );
});
