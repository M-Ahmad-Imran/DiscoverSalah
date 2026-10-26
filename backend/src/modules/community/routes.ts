import type { Filter } from "mongodb";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import type { PublicRequest, Account } from "../../db/models.js";
import { id, text, phone, page, date, prayers } from "../../lib/validation.js";
import { assert } from "../../lib/errors.js";
import { token, digest, encrypt, decrypt, stable } from "../../lib/crypto.js";
import { command, audit } from "../../lib/commands.js";
import { principal, rateLimit } from "../../middleware/security.js";
import { venueScope } from "../venues/routes.js";
const publicSchema = z
  .object({
    title: text,
    submitted: z
      .record(z.string().max(3000))
      .refine((v) => Object.keys(v).length <= 50)
      .optional(),
    areaId: id.optional(),
    venueId: id.optional(),
    details: text.min(5),
    contactNumber: phone.optional(),
    requestedRole: z.enum(["representative", "focal"]).optional(),
    availability: text.optional(),
    affiliation: text.optional(),
    reference: text.optional(),
    consent: z.boolean().optional(),
  })
  .strict();
function publicStatus(r: PublicRequest) {
  return {
    id: r._id,
    kind: r.kind,
    title: r.title,
    status: r.status,
    response: r.publicResponse,
    createdAt: r.createdAt,
  };
}
export function communityPublic(d: Database, c: Config) {
  const r = Router();
  const limiter = rateLimit(d, c, "public-requests", 10, 900);
  for (const [path, kind] of [
    ["reports", "report"],
    ["suggestions", "suggestion"],
    ["applications", "application"],
    ["contact", "contact"],
  ] as const)
    r.post("/" + path, limiter, async (req, res) => {
      const x = publicSchema.parse(req.body);
      if (kind === "application")
        assert(
          x.contactNumber &&
            x.requestedRole &&
            x.areaId &&
            x.availability &&
            x.reference &&
            x.consent,
          422,
          "APPLICATION_INCOMPLETE",
          "Provide role, area, contact permission, availability and reference.",
        );
      if (x.areaId)
        assert(
          await d.areas.findOne({ _id: x.areaId }),
          422,
          "UNKNOWN_AREA",
          "Choose a participating area.",
        );
      if (x.venueId)
        assert(
          await d.venues.findOne({
            _id: x.venueId,
            status: { $in: ["Published", "Maintenance pending"] },
          }),
          404,
          "NOT_FOUND",
          "Venue not found.",
        );
      const key = req.get("idempotency-key");
      assert(
        key && /^[A-Za-z0-9_-]{16,100}$/.test(key),
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Provide a unique Idempotency-Key.",
      );
      const hash = digest(stable({ kind, x }));
      const receiptId = digest("public:" + key);
      const receipts = d.db.collection<{
        _id: string;
        hash: string;
        cipher: string;
      }>("publicReceipts");
      const result = await d.transaction(async (s) => {
        const previous = await receipts.findOne(
          { _id: receiptId },
          { session: s },
        );
        if (previous) {
          assert(
            previous.hash === hash,
            409,
            "KEY_REUSED",
            "Key already used for a different request.",
          );
          return JSON.parse(decrypt(previous.cipher, c.DATA_KEY));
        }
        const tracking = token(),
          rid = randomUUID();
        await d.requests.insertOne(
          {
            _id: rid,
            kind,
            title: x.title,
            areaId: x.areaId,
            venueId: x.venueId,
            status: kind === "report" ? "Open" : "Submitted",
            privateCipher: encrypt(JSON.stringify(x), c.DATA_KEY),
            trackingHash: digest(tracking),
            trackingExpiresAt: new Date(Date.now() + 30 * 86400000),
            createdAt: new Date(),
          },
          { session: s },
        );
        const result = {
          id: rid,
          trackingToken: tracking,
          status: kind === "report" ? "Open" : "Submitted",
          trackingExpiresInDays: 30,
        };
        await receipts.insertOne(
          {
            _id: receiptId,
            hash,
            cipher: encrypt(JSON.stringify(result), c.DATA_KEY),
          },
          { session: s },
        );
        return result;
      });
      res.status(201).json(result);
    });
  r.post("/request-access", limiter, async (req, res) => {
    const x = z
      .object({ token: z.string().min(32).max(100) })
      .strict()
      .parse(req.body);
    const record = await d.requests.findOne({
      trackingHash: digest(x.token),
      trackingExpiresAt: { $gt: new Date() },
    });
    assert(
      record,
      404,
      "ACCESS_UNAVAILABLE",
      "Tracking access is invalid or expired.",
    );
    res.json(publicStatus(record));
  });
  r.post("/my-request/withdraw", limiter, async (req, res) => {
    const x = z
      .object({ token: z.string().min(32).max(100) })
      .strict()
      .parse(req.body);
    const record = await d.requests.findOneAndUpdate(
      {
        kind: "application",
        trackingHash: digest(x.token),
        trackingExpiresAt: { $gt: new Date() },
        status: { $nin: ["Approved", "Rejected", "Withdrawn"] },
      },
      { $set: { status: "Withdrawn", closedAt: new Date() } },
      { returnDocument: "after" },
    );
    assert(
      record,
      409,
      "WITHDRAWAL_UNAVAILABLE",
      "This request cannot be withdrawn.",
    );
    res.json(publicStatus(record));
  });
  return r;
}
export async function requestAccess(d: Database, a: Account, r: PublicRequest) {
  if (a.role === "admin") return true;
  if (r.kind === "application") return false;
  if (r.venueId)
    return !!(await d.venues.findOne({ _id: r.venueId, ...venueScope(a) }));
  return a.role === "focal" && !!r.areaId && a.areaIds.includes(r.areaId);
}
export function communityManagement(d: Database, c: Config) {
  const r = Router();
  r.post("/requests/:id/follow-up", async (req, res) => {
    const rid = id.parse(req.params.id),
      x = z
        .object({ notes: text.min(5) })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "follow-up:" + rid,
        x,
        async (session, a) => {
          const record = await d.requests.findOne({ _id: rid }, { session });
          assert(
            record && (await requestAccess(d, a, record)),
            404,
            "NOT_FOUND",
            "Request not found.",
          );
          if (record.venueId)
            await d.venues.updateOne(
              { _id: record.venueId },
              { $inc: { writeFence: 1 } },
              { session },
            );
          await d.db
            .collection("investigations")
            .insertOne(
              {
                requestId: rid,
                actorId: a._id,
                notesCipher: encrypt(x.notes, c.DATA_KEY),
                at: new Date(),
              },
              { session },
            );
          await audit(
            d,
            session,
            a._id,
            "Request follow-up added",
            rid,
            record.venueId,
          );
          return { id: rid };
        },
      ),
    );
  });
  r.get("/requests", async (req, res) => {
    const a = principal(req),
      q = page.parse(req.query);
    const vs = await d.venues
      .find(venueScope(a), { projection: { _id: 1 } })
      .limit(2000)
      .toArray();
    const filter: Filter<PublicRequest> =
      a.role === "admin"
        ? {}
        : {
            $and: [
              { kind: { $ne: "application" } },
              {
                $or: [
                  { venueId: { $in: vs.map((v) => v._id) } },
                  ...(a.role === "focal"
                    ? [
                        {
                          areaId: { $in: a.areaIds },
                          venueId: { $exists: false },
                        },
                      ]
                    : []),
                ],
              },
            ],
          };
    const rows = await d.requests
      .find(
        { ...filter, ...(q.cursor ? { _id: { $gt: q.cursor } } : {}) },
        { projection: { privateCipher: 0, trackingHash: 0 } },
      )
      .sort({ _id: 1 })
      .limit(q.limit + 1)
      .toArray();
    res.json({
      items: rows.slice(0, q.limit),
      nextCursor: rows.length > q.limit ? rows[q.limit - 1]!._id : null,
    });
  });
  r.get("/requests/:id", async (req, res) => {
    const a = principal(req),
      record = await d.requests.findOne({ _id: id.parse(req.params.id) });
    assert(
      record && (await requestAccess(d, a, record)),
      404,
      "NOT_FOUND",
      "Request not found.",
    );
    res.json({
      ...publicStatus(record),
      submitted: record.redactedAt
        ? null
        : JSON.parse(decrypt(record.privateCipher, c.DATA_KEY)),
      redactedAt: record.redactedAt,
    });
  });
  r.post("/requests/:id/decision", async (req, res) => {
    const rid = id.parse(req.params.id),
      x = z
        .object({
          expectedStatus: text,
          status: z.enum([
            "In review",
            "Escalated",
            "Resolved",
            "Dismissed",
            "Onboarding",
            "Linked",
            "Closed",
            "Awaiting checks",
            "Waitlisted",
            "Approved",
            "Rejected",
          ]),
          publicResponse: text,
          privateNotes: text,
          linkedVenueId: id.optional(),
          checks: z
            .object({
              contact: z.literal(true),
              reference: z.literal(true),
              availability: z.literal(true),
              suitability: z.literal(true),
            })
            .strict()
            .optional(),
        })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "request-decision:" + rid,
        x,
        async (s, a) => {
          assert(
            a.role !== "representative",
            403,
            "SCOPE_DENIED",
            "Reviewer access required.",
          );
          const record = await d.requests.findOne({ _id: rid }, { session: s });
          assert(
            record && (await requestAccess(d, a, record)),
            404,
            "NOT_FOUND",
            "Request not found.",
          );
          assert(
            record.status === x.expectedStatus &&
              ![
                "Approved",
                "Rejected",
                "Withdrawn",
                "Resolved",
                "Dismissed",
                "Closed",
              ].includes(record.status),
            409,
            "STATUS_CHANGED",
            "Request status changed.",
          );
          const permitted =
            record.kind === "application"
              ? [
                  "In review",
                  "Awaiting checks",
                  "Waitlisted",
                  "Approved",
                  "Rejected",
                ]
              : record.kind === "report"
                ? ["In review", "Escalated", "Resolved", "Dismissed"]
                : ["In review", "Onboarding", "Linked", "Closed"];
          assert(
            permitted.includes(x.status),
            422,
            "INVALID_TRANSITION",
            "This decision is not valid for this request.",
          );
          if (record.venueId)
            await d.venues.updateOne(
              { _id: record.venueId },
              { $inc: { revision: 1 } },
              { session: s },
            );
          if (record.kind === "application" && x.status === "Approved")
            assert(
              x.checks,
              422,
              "CHECKS_REQUIRED",
              "Application checks are required.",
            );
          await d.requests.updateOne(
            { _id: rid, status: x.expectedStatus },
            {
              $set: {
                status: x.status,
                publicResponse: x.publicResponse,
                ...(["Rejected", "Resolved", "Dismissed", "Closed"].includes(
                  x.status,
                )
                  ? { closedAt: new Date() }
                  : {}),
              },
            },
            { session: s },
          );
          await d.db.collection("investigations").insertOne(
            {
              requestId: rid,
              actorId: a._id,
              notesCipher: encrypt(x.privateNotes, c.DATA_KEY),
              checks: x.checks,
              linkedVenueId: x.linkedVenueId,
              at: new Date(),
            },
            { session: s },
          );
          await audit(d, s, a._id, "Request " + x.status, rid, record.venueId);
          return {
            id: rid,
            status: x.status,
            next:
              x.status === "Approved"
                ? "Create a scoped invitation; access is not active."
                : undefined,
          };
        },
      ),
    );
  });
  r.post("/venues/:id/disputes", async (req, res) => {
    const vid = id.parse(req.params.id),
      x = z
        .object({
          prayer: z.enum(prayers),
          date,
          reason: text.min(5),
          revision: z.number().int(),
        })
        .strict()
        .parse(req.body);
    res.status(201).json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "dispute:" + vid,
        x,
        async (s, a) => {
          assert(
            a.role !== "representative",
            403,
            "SCOPE_DENIED",
            "Reviewer required.",
          );
          const v = await d.venues.findOne(
            { _id: vid, ...venueScope(a) },
            { session: s },
          );
          assert(
            v && v.revision === x.revision,
            409,
            "VERSION_CONFLICT",
            "Reload an authorized venue.",
          );
          const did = randomUUID();
          await d.disputes.insertOne(
            {
              _id: did,
              venueId: vid,
              prayer: x.prayer,
              date: x.date,
              reason: x.reason,
              active: true,
              actorId: a._id,
              createdAt: new Date(),
            },
            { session: s },
          );
          await d.venues.updateOne(
            { _id: vid },
            { $inc: { revision: 1 } },
            { session: s },
          );
          await audit(d, s, a._id, "Dispute recorded", did, vid);
          return { id: did };
        },
      ),
    );
  });
  r.post("/disputes/:id/resolve", async (req, res) => {
    const did = id.parse(req.params.id),
      x = z
        .object({ reason: text.min(5) })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "resolve:" + did,
        x,
        async (s, a) => {
          assert(
            a.role !== "representative",
            403,
            "SCOPE_DENIED",
            "Reviewer required.",
          );
          const dispute = await d.disputes.findOne(
            { _id: did, active: true },
            { session: s },
          );
          assert(
            dispute &&
              (await d.venues.findOne(
                { _id: dispute.venueId, ...venueScope(a) },
                { session: s },
              )),
            404,
            "NOT_FOUND",
            "Dispute not found.",
          );
          await d.disputes.updateOne(
            { _id: did },
            { $set: { active: false } },
            { session: s },
          );
          await d.venues.updateOne(
            { _id: dispute.venueId },
            { $inc: { revision: 1 } },
            { session: s },
          );
          await audit(d, s, a._id, "Dispute resolved", did, dispute.venueId);
          return { id: did, active: false };
        },
      ),
    );
  });
  return r;
}
