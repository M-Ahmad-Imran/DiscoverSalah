import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import * as OTPAuth from "otpauth";
import { Database, indexes } from "../src/db/database.js";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config/env.js";
import type { Account, Venue } from "../src/db/models.js";
import { encrypt, hashPassword, keyed, digest } from "../src/lib/crypto.js";
import { today } from "../src/lib/validation.js";
import { submit, decide } from "../src/modules/schedules/service.js";
import { deliverOne } from "../src/workers/outbox.js";
import {
  retainOneBatch,
  replayDeletionLedger,
} from "../src/workers/retention.js";
let mongo: MongoMemoryReplSet, d: Database, app: ReturnType<typeof createApp>;
let rep: Account, focal: Account, admin: Account, venue: Venue;
const pass = "a synthetic long password";
const secret = new OTPAuth.Secret({ size: 20 }).base32;
const c: Config = {
  NODE_ENV: "test",
  PORT: 4000,
  MONGODB_URI: "",
  DB_NAME: "tests",
  WEB_ORIGIN: "http://localhost:5173",
  DATA_KEY: "ab".repeat(32),
  TOKEN_KEY: "cd".repeat(32),
  SESSION_HOURS: 8,
  TRUST_PROXY_HOPS: 0,
  PHONE_PROVIDER: "disabled",
  PHONE_PROVIDER_URL: "",
  PHONE_PROVIDER_TOKEN: "",
};
const provider = {
  async start() {
    return randomUUID();
  },
  async verify(_reference: string, code: string) {
    return code === "654321";
  },
};
before(
  async () => {
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    const client = await new MongoClient(mongo.getUri()).connect();
    d = new Database(client, client.db("tests"));
    await indexes(d);
    app = createApp(d, c, provider);
  },
  { timeout: 180000 },
);
after(async () => {
  await d?.client.close();
  await mongo?.stop();
});
beforeEach(async () => {
  for (const coll of await d.db.collections()) await coll.deleteMany({});
  const areaId = randomUUID();
  const hashed = await hashPassword(pass);
  function account(role: Account["role"], number: string): Account {
    return {
      _id: randomUUID(),
      name: "Synthetic " + role,
      role,
      areaIds: [areaId],
      active: true,
      phoneHash: keyed(number, c.TOKEN_KEY),
      phoneCipher: encrypt(number, c.DATA_KEY),
      passwordHash: hashed,
      contactVerifiedAt: new Date(),
      authVersion: 0,
      fence: 0,
      createdAt: new Date(),
      ...(role === "admin" ? { mfaSecret: encrypt(secret, c.DATA_KEY) } : {}),
    };
  }
  rep = account("representative", "+12025550101");
  focal = account("focal", "+12025550102");
  admin = account("admin", "+12025550104");
  await d.accounts.insertMany([rep, focal, admin]);
  await d.areas.insertOne({
    _id: areaId,
    name: "Test area",
    city: "Test city",
    focalId: focal._id,
    revision: 0,
  });
  venue = {
    _id: randomUUID(),
    name: "Synthetic Mosque",
    urdu: "نمونہ",
    areaId,
    city: "Test city",
    address: "Synthetic address",
    entrance: { type: "Point", coordinates: [74.3, 31.5] },
    kind: "Mosque",
    facilities: { Wudu: "Unknown" },
    status: "Published",
    repId: rep._id,
    focalId: focal._id,
    revision: 0,
    authorId: rep._id,
    initial: {
      times: {
        Fajr: "05:20",
        Dhuhr: "13:30",
        Asr: "16:15",
        Maghrib: "17:40",
        Isha: "19:15",
      },
      special: [],
      effective: today(),
      reason: "Initial test",
    },
    createdAt: new Date(),
  };
  await d.venues.insertOne(venue);
  await d.contacts.insertOne({
    _id: randomUUID(),
    venueId: venue._id,
    nameCipher: encrypt("Private Imam", c.DATA_KEY),
    phoneCipher: encrypt("+12025550103", c.DATA_KEY),
    permission: true,
    verifiedAt: new Date(),
  });
});
async function login(number = "+12025550101") {
  const result = await request(app)
    .post("/api/v1/auth/sign-in")
    .set("Origin", c.WEB_ORIGIN)
    .send({ contactNumber: number, password: pass });
  assert.equal(result.status, 200);
  return {
    cookie: String(result.headers["set-cookie"]?.[0] ?? "").split(";")[0]!,
    csrf: result.body.csrfToken as string,
  };
}
const proposal = (revision = 0) => ({
  ...venue.initial,
  times: { ...venue.initial.times, Asr: "16:30" },
  baseRevision: revision,
  reason: "Seasonal schedule change",
});
const evidence = () => ({
  outcome: "Confirmed as submitted" as const,
  person: "Synthetic Imam",
  calledAt: new Date().toISOString(),
  notes: "Verified all changes and effective date.",
});
test("public DTO never exposes contacts, authors, passwords or private evidence", async () => {
  const result = await request(app).get("/api/v1/venues/" + venue._id);
  assert.equal(result.status, 200);
  assert.equal(result.body.repId, undefined);
  assert.equal(result.body.initial, undefined);
  assert.equal(JSON.stringify(result.body).includes("Cipher"), false);
  const contact = await request(app).get(
    "/api/v1/management/venues/" + venue._id + "/contact",
  );
  assert.equal(contact.status, 401);
});
test("origin and CSRF protection reject untrusted writes; body is strictly validated", async () => {
  const auth = await login();
  const path = "/api/v1/management/venues/" + venue._id + "/proposals";
  assert.equal(
    (await request(app).post(path).set("Cookie", auth.cookie).send(proposal()))
      .status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post(path)
        .set("Origin", c.WEB_ORIGIN)
        .set("Cookie", auth.cookie)
        .send(proposal())
    ).status,
    403,
  );
  const result = await request(app)
    .post(path)
    .set("Origin", c.WEB_ORIGIN)
    .set("Cookie", auth.cookie)
    .set("X-CSRF-Token", auth.csrf)
    .set("Idempotency-Key", randomUUID())
    .send({ ...proposal(), authorId: admin._id });
  assert.equal(result.status, 422);
  assert.equal(await d.proposals.countDocuments(), 0);
});
test("submit is atomic and identical idempotent replay returns the same proposal", async () => {
  const key = randomUUID();
  const first = await submit(d, rep, venue._id, key, proposal());
  const replay = await submit(d, rep, venue._id, key, proposal());
  assert.equal(first.id, replay.id);
  assert.equal(await d.proposals.countDocuments(), 1);
  assert.equal(await d.tasks.countDocuments(), 1);
  assert.equal(await d.audit.countDocuments(), 1);
  assert.equal(await d.outbox.countDocuments(), 1);
  await assert.rejects(
    submit(d, rep, venue._id, key, { ...proposal(), reason: "Different body" }),
    /already used/,
  );
});
test("two concurrent submissions with same revision have exactly one winner", async () => {
  const results = await Promise.allSettled([
    submit(d, rep, venue._id, randomUUID(), proposal()),
    submit(d, rep, venue._id, randomUUID(), proposal()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await d.proposals.countDocuments({ state: "Submitted" }), 1);
});
test("superseded and self-authored proposals cannot be approved, including admin", async () => {
  const first = await submit(d, admin, venue._id, randomUUID(), proposal());
  await assert.rejects(
    decide(d, c, admin, first.id, randomUUID(), {
      decision: "Approved",
      expectedVersion: 1,
      expectedVenueRevision: 1,
      publicReason: "Independent verification",
      evidence: evidence(),
    }),
    /independent/,
  );
  await submit(d, rep, venue._id, randomUUID(), proposal(1));
  await assert.rejects(
    decide(d, c, focal, first.id, randomUUID(), {
      decision: "Approved",
      expectedVersion: 1,
      expectedVenueRevision: 2,
      publicReason: "Independent verification",
      evidence: evidence(),
    }),
    /changed/,
  );
});
test("unreachable evidence does not approve; valid future approval stays future-effective", async () => {
  const future = today(new Date(Date.now() + 86400000));
  const p = await submit(d, rep, venue._id, randomUUID(), {
    ...proposal(),
    effective: future,
  });
  await assert.rejects(
    decide(d, c, focal, p.id, randomUUID(), {
      decision: "Approved",
      expectedVersion: 1,
      expectedVenueRevision: 1,
      publicReason: "All values checked",
      evidence: { ...evidence(), outcome: "No answer / unreachable" },
    }),
    /confirmation/,
  );
  assert.equal((await d.proposals.findOne({ _id: p.id }))?.state, "Submitted");
  await decide(d, c, focal, p.id, randomUUID(), {
    decision: "Approved",
    expectedVersion: 1,
    expectedVenueRevision: 1,
    publicReason: "All values checked",
    evidence: evidence(),
  });
  const now = await request(app)
    .get("/api/v1/venues/" + venue._id + "/sessions")
    .query({ date: today(), prayer: "Asr" });
  const later = await request(app)
    .get("/api/v1/venues/" + venue._id + "/sessions")
    .query({ date: future, prayer: "Asr" });
  assert.equal(now.body.items[0].time, "16:15");
  assert.equal(later.body.items[0].time, "16:30");
});
test("current account revocation is checked after authentication and at commit", async () => {
  const auth = await login();
  await d.accounts.updateOne(
    { _id: rep._id },
    { $set: { active: false }, $inc: { authVersion: 1 } },
  );
  assert.equal(
    (
      await request(app)
        .get("/api/v1/management/venues")
        .set("Cookie", auth.cookie)
    ).status,
    403,
  );
  await assert.rejects(
    submit(d, rep, venue._id, randomUUID(), proposal()),
    /access has changed/,
  );
});
test("outbox delivers once and does not alter schedule approval state", async () => {
  await submit(d, rep, venue._id, randomUUID(), proposal());
  await Promise.all([deliverOne(d), deliverOne(d)]);
  await deliverOne(d);
  assert.equal(await d.notifications.countDocuments(), 1);
  assert.equal(
    (await d.proposals.findOne({ venueId: venue._id }))?.state,
    "Submitted",
  );
  assert.equal((await d.outbox.findOne({}))?.state, "delivered");
});
test("tracking requires the high-entropy token and omits private submitted details", async () => {
  const response = await request(app)
    .post("/api/v1/applications")
    .set("Origin", c.WEB_ORIGIN)
    .set("Idempotency-Key", randomUUID())
    .send({
      title: "Synthetic applicant",
      areaId: venue.areaId,
      details: "Would like to contribute",
      contactNumber: "+12025550105",
      requestedRole: "representative",
      availability: "Weekly",
      reference: "Private reference",
      consent: true,
    });
  assert.equal(response.status, 201);
  const track = await request(app)
    .post("/api/v1/request-access")
    .set("Origin", c.WEB_ORIGIN)
    .send({ token: response.body.trackingToken });
  assert.equal(track.status, 200);
  assert.equal(JSON.stringify(track.body).includes("Private reference"), false);
  assert.equal(
    (
      await request(app)
        .post("/api/v1/request-access")
        .set("Origin", c.WEB_ORIGIN)
        .send({ token: response.body.id })
    ).status,
    404,
  );
});
test("issuer reset revokes sessions and requires a new private password", async () => {
  const existing = await login(),
    issuer = await login("+12025550102");
  const reset = await request(app)
    .post("/api/v1/management/accounts/" + rep._id + "/reset-credentials")
    .set("Origin", c.WEB_ORIGIN)
    .set("Cookie", issuer.cookie)
    .set("X-CSRF-Token", issuer.csrf)
    .set("Idempotency-Key", randomUUID())
    .send({
      authVersion: 0,
      reason: "Identity confirmed independently",
      contactConfirmed: true,
    });
  assert.equal(reset.status, 200);
  assert.ok(reset.body.temporaryPassword);
  assert.equal(
    (
      await request(app)
        .get("/api/v1/management/venues")
        .set("Cookie", existing.cookie)
    ).status,
    401,
  );
  const sign = await request(app)
    .post("/api/v1/auth/sign-in")
    .set("Origin", c.WEB_ORIGIN)
    .send({
      contactNumber: "+12025550101",
      password: reset.body.temporaryPassword,
    });
  assert.equal(sign.status, 200);
  assert.equal(sign.body.account.mustChangePassword, true);
  const cookie = String(sign.headers["set-cookie"]?.[0] || "").split(";")[0]!;
  assert.equal(
    (
      await request(app)
        .get("/api/v1/management/workspace")
        .set("Cookie", cookie)
    ).status,
    403,
  );
  const change = await request(app)
    .post("/api/v1/auth/change-password")
    .set("Origin", c.WEB_ORIGIN)
    .set("Cookie", cookie)
    .set("X-CSRF-Token", sign.body.csrfToken)
    .send({
      currentPassword: reset.body.temporaryPassword,
      newPassword: "new independently chosen password",
    });
  assert.equal(change.status, 204);
  assert.equal(
    (await d.accounts.findOne({ _id: rep._id }))?.mustChangePassword,
    false,
  );
});
test("admin password alone grants no session; MFA challenge cannot be reused", async () => {
  const sign = await request(app)
    .post("/api/v1/auth/sign-in")
    .set("Origin", c.WEB_ORIGIN)
    .send({ contactNumber: "+12025550104", password: pass });
  assert.equal(sign.status, 202);
  assert.equal(sign.headers["set-cookie"], undefined);
  const code = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
  }).generate();
  const body = { challenge: sign.body.challenge, code };
  const verified = await request(app)
    .post("/api/v1/auth/mfa")
    .set("Origin", c.WEB_ORIGIN)
    .send(body);
  assert.equal(verified.status, 200);
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/mfa")
        .set("Origin", c.WEB_ORIGIN)
        .send(body)
    ).status,
    401,
  );
});
test("SMS recovery and invitation endpoints are retired for all accounts", async () => {
  for (const path of [
    "/auth/recovery",
    "/auth/reset",
    "/invitations/challenge",
    "/invitations/accept",
  ]) {
    const result = await request(app)
      .post("/api/v1" + path)
      .set("Origin", c.WEB_ORIGIN)
      .send({});
    assert.equal(result.status, 410);
  }
});
test("discovery returns only selected prayer/date and stable pagination", async () => {
  const second = { ...venue, _id: randomUUID(), name: "Second Mosque" };
  await d.venues.insertOne(second);
  const body = {
    city: "Test city",
    scope: "city",
    prayer: "Asr",
    date: today(),
    upcomingOnly: false,
    limit: 1,
  };
  const first = await request(app)
    .post("/api/v1/discover/query")
    .set("Origin", c.WEB_ORIGIN)
    .send(body);
  assert.equal(first.status, 200);
  assert.equal(first.body.items.length, 1);
  assert.equal(first.body.items[0].session.prayer, "Asr");
  const next = await request(app)
    .post("/api/v1/discover/query")
    .set("Origin", c.WEB_ORIGIN)
    .send({ ...body, cursor: first.body.nextCursor });
  assert.equal(next.status, 200);
  assert.notEqual(next.body.items[0].venue.id, first.body.items[0].venue.id);
  assert.equal(next.body.nextCursor, null);
});
test("sensitive responses are no-store and malformed data does not leak stack traces", async () => {
  const result = await request(app)
    .post("/api/v1/auth/sign-in")
    .set("Origin", c.WEB_ORIGIN)
    .send({ contactNumber: { $ne: null }, password: pass });
  assert.equal(result.status, 422);
  assert.equal(result.headers["cache-control"], "no-store");
  assert.equal(result.body.stack, undefined);
});

test("privacy cleanup removes expired application content and ledger replay prevents resurrection", async () => {
  const rid = randomUUID();
  const now = new Date();
  await d.requests.insertOne({
    _id: rid,
    kind: "application",
    title: "Private applicant name",
    status: "Rejected",
    privateCipher: encrypt("private details", c.DATA_KEY),
    trackingHash: digest(randomUUID()),
    trackingExpiresAt: now,
    createdAt: new Date(now.getTime() - 100 * 86400000),
    closedAt: new Date(now.getTime() - 91 * 86400000),
  });
  await d.db
    .collection("investigations")
    .insertOne({ requestId: rid, notesCipher: "private" });
  assert.equal(await retainOneBatch(d, now), 1);
  assert.equal((await d.requests.findOne({ _id: rid }))?.privateCipher, "");
  assert.equal(
    await d.db.collection("investigations").countDocuments({ requestId: rid }),
    0,
  );
  assert.equal(await retainOneBatch(d, now), 0);
  await d.requests.updateOne(
    { _id: rid },
    { $set: { privateCipher: "restored old ciphertext" } },
  );
  assert.equal(await replayDeletionLedger(d), 1);
  assert.equal((await d.requests.findOne({ _id: rid }))?.privateCipher, "");
});

test("unrelated venue metadata changes do not strand a pending review", async () => {
  const p = await submit(d, rep, venue._id, randomUUID(), proposal());
  await d.venues.updateOne({ _id: venue._id }, { $inc: { revision: 1 } });
  const result = await decide(d, c, focal, p.id, randomUUID(), {
    decision: "Approved",
    expectedVersion: p.version,
    expectedVenueRevision: 2,
    publicReason: "Confirmed schedule",
    evidence: evidence(),
  });
  assert.equal(result.state, "Approved");
});

test("only focal issues representative credentials, only admin issues focal credentials", async () => {
  const f = await login("+12025550102");
  const body = {
    name: "New representative",
    role: "representative",
    contactNumber: "+12025550177",
    areaIds: rep.areaIds,
    reason: "Independent reference checked",
    contactConfirmed: true,
  };
  const send = (auth: { cookie: string; csrf: string }, data: object) =>
    request(app)
      .post("/api/v1/management/credentials")
      .set("Origin", c.WEB_ORIGIN)
      .set("Cookie", auth.cookie)
      .set("X-CSRF-Token", auth.csrf)
      .set("Idempotency-Key", randomUUID())
      .send(data);
  assert.equal((await send(f, body)).status, 201);
  assert.equal(
    (await send(f, { ...body, role: "focal", contactNumber: "+12025550178" }))
      .status,
    403,
  );
  assert.equal(
    (await send(await login(), { ...body, contactNumber: "+12025550179" }))
      .status,
    403,
  );
  const sign = await request(app)
    .post("/api/v1/auth/sign-in")
    .set("Origin", c.WEB_ORIGIN)
    .send({ contactNumber: "+12025550104", password: pass });
  const verified = await request(app)
    .post("/api/v1/auth/mfa")
    .set("Origin", c.WEB_ORIGIN)
    .send({
      challenge: sign.body.challenge,
      code: new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
      }).generate(),
    });
  const a = {
    cookie: String(verified.headers["set-cookie"]?.[0] || "").split(";")[0]!,
    csrf: verified.body.csrfToken,
  };
  assert.equal(
    (await send(a, { ...body, role: "focal", contactNumber: "+12025550180" }))
      .status,
    201,
  );
  assert.equal(
    (await send(a, { ...body, contactNumber: "+12025550181" })).status,
    403,
  );
  assert.equal(
    (
      await send(f, {
        ...body,
        contactNumber: "+12025550182",
        areaIds: [randomUUID()],
      })
    ).status,
    403,
  );
});
test("workspace exposes only permitted private data; public catalog omits contacts", async () => {
  const catalog = await request(app).get("/api/v1/catalog");
  assert.equal(catalog.status, 200);
  assert.equal(JSON.stringify(catalog.body).includes("Private Imam"), false);
  assert.deepEqual(catalog.body.accounts, []);
  const r = await login();
  const result = await request(app)
    .get("/api/v1/management/workspace")
    .set("Cookie", r.cookie);
  assert.equal(result.status, 200);
  assert.equal(result.body.accounts.length, 1);
  assert.equal(result.body.venues[0].contactName, "Private Imam");
  assert.equal(JSON.stringify(result.body).includes("passwordHash"), false);
});

test("issuer contact change revokes old sessions and preserves the password", async () => {
  const representative = await login();
  const issuer = await login("+12025550102");
  const change = await request(app)
    .post("/api/v1/management/accounts/" + rep._id + "/contact")
    .set("Origin", c.WEB_ORIGIN)
    .set("Cookie", issuer.cookie)
    .set("X-CSRF-Token", issuer.csrf)
    .set("Idempotency-Key", randomUUID())
    .send({
      authVersion: 0,
      contactNumber: "+12025550108",
      contactConfirmed: true,
      reason: "Owner independently confirmed the replacement number",
    });
  assert.equal(change.status, 200);
  assert.equal(
    (
      await request(app)
        .get("/api/v1/session")
        .set("Cookie", representative.cookie)
    ).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/sign-in")
        .set("Origin", c.WEB_ORIGIN)
        .send({ contactNumber: "+12025550101", password: pass })
    ).status,
    401,
  );
  await login("+12025550108");
});

test("returned registration resubmits atomically, preserves history, and requires fresh independent review", async () => {
  const auth = await login();
  const reviewer = await login("+12025550102");
  const send = (
    who: typeof auth,
    path: string,
    body: object,
    key = randomUUID(),
  ) =>
    request(app)
      .post("/api/v1/management/registrations" + path)
      .set("Origin", c.WEB_ORIGIN)
      .set("Cookie", who.cookie)
      .set("X-CSRF-Token", who.csrf)
      .set("Idempotency-Key", key)
      .send(body);
  const input = {
    name: "New registration",
    urdu: "New registration",
    areaId: venue.areaId,
    address: venue.address,
    lat: 31.5,
    lng: 74.3,
    kind: "Mosque",
    facilities: venue.facilities,
    initial: venue.initial,
    imam: {
      name: "Original Imam",
      contactNumber: "+12025550103",
      permission: true,
    },
  };
  const created = await send(auth, "", input);
  assert.equal(created.status, 201);
  const vid = created.body.id;
  const path = "/" + vid;
  const correction = {
    ...input,
    name: "Corrected mosque",
    revision: 1,
    initial: {
      ...venue.initial,
      times: { ...venue.initial.times, Asr: "16:40" },
    },
    imam: { ...input.imam, name: "Corrected Imam" },
  };
  assert.equal(
    (await send(auth, path + "/resubmit", { ...correction, revision: 0 }))
      .status,
    409,
  );
  assert.equal(
    (
      await send(reviewer, path + "/decision", {
        revision: 0,
        decision: "Returned",
        reason: "Correct the entrance and timetable",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await send(reviewer, path + "/decision", {
        revision: 1,
        decision: "Rejected",
        reason: "Cannot decide without resubmission",
      })
    ).status,
    409,
  );
  assert.equal(
    (await send(reviewer, path + "/resubmit", correction)).status,
    403,
  );
  assert.equal(
    (
      await send(auth, path + "/resubmit", {
        ...correction,
        areaId: randomUUID(),
      })
    ).status,
    422,
  );
  assert.equal(
    (await send(auth, path + "/resubmit", { ...correction, revision: 0 }))
      .status,
    409,
  );
  assert.equal(
    (
      await send(auth, path + "/resubmit", {
        ...correction,
        imam: { ...input.imam, permission: false },
      })
    ).status,
    422,
  );
  const key = randomUUID();
  const saved = await send(auth, path + "/resubmit", correction, key);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual(
    (await send(auth, path + "/resubmit", correction, key)).body,
    saved.body,
  );
  assert.equal((await send(auth, path + "/resubmit", correction)).status, 409);
  const current = await d.venues.findOne({ _id: vid });
  assert.equal(current?.status, "Draft");
  assert.equal(current?.registrationState, "Submitted");
  assert.equal(current?.revision, 2);
  assert.equal(current?.initial.times.Asr, "16:40");
  assert.equal(
    (await d.contacts.findOne({ venueId: vid }))?.verifiedAt,
    undefined,
  );
  assert.equal(
    await d.db
      .collection("registrationRevisions")
      .countDocuments({ venueId: vid }),
    1,
  );
  assert.equal(
    await d.db
      .collection("registrationDecisions")
      .countDocuments({ venueId: vid }),
    1,
  );
  assert.equal((await d.tasks.findOne({ recordId: vid }))?.state, "Open");
  const approval = {
    revision: 2,
    decision: "Approved",
    reason: "All corrections independently verified",
    checks: {
      identity: true,
      entrance: true,
      relationship: true,
      contactAuthority: true,
    },
    evidence: evidence(),
  };
  assert.equal((await send(auth, path + "/decision", approval)).status, 403);
  assert.equal(
    (await send(reviewer, path + "/decision", approval)).status,
    200,
  );
  assert.equal((await d.venues.findOne({ _id: vid }))?.status, "Published");
  assert.equal(
    await d.db
      .collection("registrationDecisions")
      .countDocuments({ venueId: vid }),
    2,
  );
  assert.equal(
    (await send(auth, path + "/resubmit", { ...correction, revision: 3 }))
      .status,
    409,
  );
});

test("screen pages reach records beyond old caps and retain effective timetable heads", async () => {
  const auth = await login();
  const extra = Array.from({ length: 224 }, (_, i) => ({
    ...venue,
    _id: randomUUID(),
    name: `Paged mosque ${String(i).padStart(3, "0")}`,
  }));
  await d.venues.insertMany(extra);
  const hidden = {
    ...venue,
    _id: randomUUID(),
    repId: randomUUID(),
    focalId: randomUUID(),
    name: "Outside scope",
  };
  await d.venues.insertOne(hidden);
  const all = [venue, ...extra].sort((a, b) => a._id.localeCompare(b._id));
  const last = all[all.length - 1]!;
  const history = Array.from({ length: 1101 }, (_, i) => ({
    _id: randomUUID(),
    venueId: last._id,
    version: i + 1,
    baseRevision: 0,
    authorId: rep._id,
    state: (i === 0 ? "Approved" : "Rejected") as "Approved" | "Rejected",
    snapshot: {
      ...venue.initial,
      times: { ...venue.initial.times, Asr: i === 0 ? "16:05" : "16:50" },
    },
    before: venue.initial,
    createdAt: new Date(2000, 0, i + 1),
  }));
  await d.proposals.insertMany(history);
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const page: request.Response = await request(app)
      .get("/api/v1/management/workspace")
      .query({ view: "venues", limit: 20, ...(cursor ? { cursor } : {}) })
      .set("Cookie", auth.cookie);
    assert.equal(page.status, 200, JSON.stringify(page.body));
    assert.ok(page.body.venues.length <= 20);
    seen.push(...page.body.page.ids);
    cursor = page.body.page.nextCursor;
  } while (cursor);
  assert.equal(seen.length, 225);
  assert.equal(new Set(seen).size, 225);
  assert.ok(!seen.includes(hidden._id));
  const detail = await request(app)
    .get("/api/v1/management/workspace")
    .query({ view: "venue", id: last._id })
    .set("Cookie", auth.cookie);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.venues[0].times.Asr, "16:05");
  assert.ok(
    detail.body.proposals.some((p: { id: string }) => p.id === history[0]!._id),
  );
  assert.ok(detail.body.proposals.length < 5);
  const search = await request(app)
    .get("/api/v1/management/workspace")
    .query({ view: "venues", q: last.name })
    .set("Cookie", auth.cookie);
  assert.ok(search.body.venues.some((v: { id: string }) => v.id === last._id));
  const denied = await request(app)
    .get("/api/v1/management/workspace")
    .query({ view: "venue", id: hidden._id })
    .set("Cookie", auth.cookie);
  assert.deepEqual(denied.body.venues, []);
  assert.equal(
    (await request(app).get("/api/v1/catalog?view=accounts")).status,
    403,
  );
  assert.equal(
    (await request(app).get("/api/v1/catalog?view=venues&limit=51")).status,
    422,
  );
  assert.equal(
    (await request(app).get("/api/v1/catalog?view=venues&cursor=bad")).status,
    422,
  );
  const publicDetail = await request(app)
    .get("/api/v1/catalog")
    .query({ view: "venue", id: last._id });
  assert.equal(publicDetail.body.venues[0].contactNumber, undefined);
  assert.deepEqual(publicDetail.body.accounts, []);
  const firstSession = await request(app)
    .get("/api/v1/catalog")
    .query({ view: "discovery", date: "2099-01-01", prayer: "Asr", limit: 1 });
  assert.equal(firstSession.status, 200, JSON.stringify(firstSession.body));
  assert.equal(firstSession.body.discoverySessions[0].time, "16:05");
  const secondSession = await request(app)
    .get("/api/v1/catalog")
    .query({
      view: "discovery",
      date: "2099-01-01",
      prayer: "Asr",
      limit: 1,
      cursor: firstSession.body.page.nextCursor,
    });
  assert.equal(secondSession.status, 200);
  assert.equal(secondSession.body.discoverySessions[0].time, "16:15");
  assert.notEqual(secondSession.body.discoverySessions[0].venueId, last._id);
});

test("request and notification pages remain complete and scoped; expired notices filter before paging", async () => {
  const auth = await login();
  const ids = Array.from({ length: 43 }, () => randomUUID());
  await d.requests.insertMany(
    ids.map((_id, i) => ({
      _id,
      kind: "report" as const,
      title: `Report ${i}`,
      venueId: venue._id,
      status: i % 2 ? "Open" : "Resolved",
      privateCipher: encrypt(
        JSON.stringify({ description: "test" }),
        c.DATA_KEY,
      ),
      trackingHash: randomUUID(),
      trackingExpiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    })),
  );
  await d.notifications.insertMany(
    ids.map((_id) => ({
      _id,
      accountId: rep._id,
      title: "Test notification",
      href: "/manage",
      read: false,
      createdAt: new Date(),
    })),
  );
  await d.notifications.insertOne({
    _id: randomUUID(),
    accountId: focal._id,
    title: "Other account",
    href: "/manage",
    read: false,
    createdAt: new Date(),
  });
  for (const view of ["requests", "notifications"]) {
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const response = await request(app)
        .get("/api/v1/management/workspace")
        .query({ view, limit: 7, ...(cursor ? { cursor } : {}) })
        .set("Cookie", auth.cookie);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.ok(response.body.page.ids.length <= 7);
      seen.push(...response.body.page.ids);
      cursor = response.body.page.nextCursor;
    } while (cursor);
    assert.equal(seen.length, 43);
    assert.equal(new Set(seen).size, 43);
  }
  const filtered = await request(app)
    .get("/api/v1/management/workspace")
    .query({ view: "requests", status: "Open", limit: 50 })
    .set("Cookie", auth.cookie);
  assert.equal(filtered.body.page.ids.length, 21);
  const base = {
    venueId: venue._id,
    authorId: rep._id,
    title: "Notice",
    body: "Test notice body",
    category: "Mosque service" as const,
    event: new Date().toISOString(),
    sourceCipher: encrypt("test", c.DATA_KEY),
    state: "Published" as const,
    revision: 0,
    createdAt: new Date(),
  };
  await d.notices.insertMany([
    { ...base, _id: randomUUID(), expires: "2000-01-01T00:00:00.000Z" },
    { ...base, _id: randomUUID(), expires: "2099-01-01T00:00:00.000Z" },
  ]);
  const expired = await request(app)
    .get("/api/v1/management/workspace")
    .query({ view: "notices", status: "Expired" })
    .set("Cookie", auth.cookie);
  assert.equal(expired.status, 200);
  assert.equal(expired.body.notices.length, 1);
  assert.ok(expired.body.notices[0].expires.startsWith("2000"));
  const live = await request(app).get("/api/v1/catalog?view=notices");
  assert.equal(live.body.notices.length, 1);
  assert.ok(live.body.notices[0].expires.startsWith("2099"));
});
