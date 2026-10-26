import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Filter } from "mongodb";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import type { Account, Venue } from "../../db/models.js";
import { assert } from "../../lib/errors.js";
import {
  id,
  text,
  phone,
  snapshot,
  date,
  prayers,
  page,
  evidence,
  today,
} from "../../lib/validation.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { command, audit, notify } from "../../lib/commands.js";
import { principal } from "../../middleware/security.js";
import { manages, reviews, publicVenue } from "./policies.js";
import { effective, sessions, confidence } from "../schedules/policy.js";
import { submit, decide } from "../schedules/service.js";
export function venueScope(a: Account, includeBackup = false): Filter<Venue> {
  if (a.role === "admin") return {};
  if (a.role === "representative") return { repId: a._id };
  return includeBackup
    ? {
        $or: [
          { focalId: a._id },
          {
            "backup.reviewerId": a._id,
            "backup.startsAt": { $lte: new Date() },
            "backup.endsAt": { $gt: new Date() },
          },
        ],
      }
    : { focalId: a._id };
}
export function publicRoutes(d: Database) {
  const r = Router();
  r.get("/areas", async (_req, res) =>
    res.json({
      items: (await d.areas.find({}).sort({ _id: 1 }).limit(200).toArray()).map(
        (a) => ({ id: a._id, name: a.name, city: a.city }),
      ),
    }),
  );
  r.get("/venues", async (req, res) => {
    const q = page
      .extend({
        city: z.string().max(100).optional(),
        areaId: id.optional(),
        scope: z.enum(["nearby", "city"]).default("city"),
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
        radius: z.coerce.number().min(0.1).max(7).default(5),
      })
      .strict()
      .parse(req.query);
    const f: Filter<Venue> = {
      status: { $in: ["Published", "Maintenance pending"] },
      ...(q.city ? { city: q.city } : {}),
      ...(q.areaId ? { areaId: q.areaId } : {}),
      ...(q.cursor ? { _id: { $gt: q.cursor } } : {}),
    };
    if (q.scope === "nearby") {
      assert(
        q.lat !== undefined && q.lng !== undefined,
        422,
        "ORIGIN_REQUIRED",
        "Select a precise origin for Nearby.",
      );
      f.entrance = {
        $geoWithin: { $centerSphere: [[q.lng, q.lat], q.radius / 6371] },
      };
    }
    const rows = await d.venues
      .find(f)
      .sort({ _id: 1 })
      .limit(q.limit + 1)
      .maxTimeMS(3000)
      .toArray();
    res.setHeader("Cache-Control", "public, max-age=15, must-revalidate");
    res.json({
      items: rows.slice(0, q.limit).map(publicVenue),
      nextCursor: rows.length > q.limit ? rows[q.limit - 1]!._id : null,
      coverage: "Participating venues only",
      serverTime: new Date().toISOString(),
    });
  });
  r.get("/venues/:id", async (req, res) => {
    const v = await d.venues.findOne({
      _id: id.parse(req.params.id),
      status: { $in: ["Published", "Maintenance pending"] },
    });
    assert(v, 404, "NOT_FOUND", "Venue not found.");
    res.setHeader("Cache-Control", "public, max-age=15, must-revalidate");
    res.json(publicVenue(v));
  });
  r.get("/venues/:id/sessions", async (req, res) => {
    const q = z
      .object({ date, prayer: z.enum(prayers) })
      .strict()
      .parse(req.query);
    const v = await d.venues.findOne({
      _id: id.parse(req.params.id),
      status: { $in: ["Published", "Maintenance pending"] },
    });
    assert(v, 404, "NOT_FOUND", "Venue not found.");
    const approved = await d.proposals
      .find({
        venueId: v._id,
        state: "Approved",
        "snapshot.effective": { $lte: q.date },
      })
      .sort({ "snapshot.effective": -1, version: -1 })
      .limit(1)
      .toArray();
    const pending = await d.proposals.findOne({
      venueId: v._id,
      state: "Submitted",
    });
    const disputes = await d.disputes
      .find({ venueId: v._id, active: true, date: q.date })
      .toArray();
    res.setHeader("Cache-Control", "public, max-age=15, must-revalidate");
    res.json({
      venueRevision: v.revision,
      date: q.date,
      timezone: "Asia/Karachi",
      serverTime: new Date().toISOString(),
      items: sessions(effective(v, approved, q.date), q.prayer, q.date).map(
        (s) => ({
          ...s,
          status: confidence(
            v,
            pending,
            disputes,
            q.prayer,
            q.date,
            s.provisional,
          ),
          started:
            Date.parse(s.date + "T" + s.time + ":00+05:00") <= Date.now(),
          arrival: { status: "Unavailable", reason: "ROUTING_NOT_CONFIGURED" },
        }),
      ),
    });
  });
  r.post("/discover/evaluate", async (req, res) => {
    z.object({
      venueIds: z.array(id).max(10),
      origin: z
        .object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
        .strict(),
      mode: z.enum(["walking", "motorcycle"]),
      date,
      prayer: z.enum(prayers),
    })
      .strict()
      .parse(req.body);
    res.json({
      status: "Unavailable",
      reason: "ROUTING_NOT_CONFIGURED",
      message:
        "Timetable browsing remains available. No route or positive arrival estimate was calculated.",
    });
  });
  return r;
}
export function managementVenueRoutes(d: Database, c: Config) {
  const r = Router();
  r.get("/venues", async (req, res) => {
    const a = principal(req),
      q = page.parse(req.query);
    const rows = await d.venues
      .find({
        ...venueScope(a),
        ...(q.cursor ? { _id: { $gt: q.cursor } } : {}),
      })
      .sort({ _id: 1 })
      .limit(q.limit + 1)
      .toArray();
    res.json({
      items: rows.slice(0, q.limit).map((v) => ({
        ...publicVenue(v),
        repId: v.repId,
        focalId: v.focalId,
      })),
      nextCursor: rows.length > q.limit ? rows[q.limit - 1]!._id : null,
    });
  });
  r.get("/venues/:id", async (req, res) => {
    const a = principal(req);
    const v = await d.venues.findOne({
      _id: id.parse(req.params.id),
      ...venueScope(a, true),
    });
    assert(v, 404, "NOT_FOUND", "Venue not found.");
    res.json({
      ...publicVenue(v),
      repId: v.repId,
      focalId: v.focalId,
      initial: v.initial,
      backup: v.backup,
    });
  });
  r.get("/venues/:id/contact", async (req, res) => {
    const a = principal(req);
    const v = await d.venues.findOne({
      _id: id.parse(req.params.id),
      ...venueScope(a, true),
    });
    assert(v, 404, "NOT_FOUND", "Venue not found.");
    const contact = await d.contacts.findOne({ venueId: v._id });
    assert(contact, 404, "NOT_FOUND", "Contact not recorded.");
    res.json({
      name: decrypt(contact.nameCipher, c.DATA_KEY),
      contactNumber: decrypt(contact.phoneCipher, c.DATA_KEY),
      verifiedAt: contact.verifiedAt,
    });
  });
  r.post("/venues/:id/proposals", async (req, res) =>
    res
      .status(201)
      .json(
        await submit(
          d,
          principal(req),
          id.parse(req.params.id),
          req.get("idempotency-key"),
          req.body,
        ),
      ),
  );
  r.post("/proposals/:id/decision", async (req, res) =>
    res.json(
      await decide(
        d,
        c,
        principal(req),
        id.parse(req.params.id),
        req.get("idempotency-key"),
        req.body,
      ),
    ),
  );
  r.get("/proposals", async (req, res) => {
    const a = principal(req),
      q = page.parse(req.query);
    const venues = await d.venues
      .find(venueScope(a, true), { projection: { _id: 1 } })
      .limit(2000)
      .toArray();
    const rows = await d.proposals
      .find(
        {
          venueId: { $in: venues.map((v) => v._id) },
          ...(q.cursor ? { _id: { $gt: q.cursor } } : {}),
        },
        { projection: { evidenceCipher: 0 } },
      )
      .sort({ _id: 1 })
      .limit(q.limit + 1)
      .toArray();
    res.json({
      items: rows.slice(0, q.limit),
      nextCursor: rows.length > q.limit ? rows[q.limit - 1]!._id : null,
    });
  });
  r.get("/proposals/:id", async (req, res) => {
    const a = principal(req);
    const p = await d.proposals.findOne({ _id: id.parse(req.params.id) });
    assert(p, 404, "NOT_FOUND", "Proposal not found.");
    const v = await d.venues.findOne({
      _id: p.venueId,
      ...venueScope(a, true),
    });
    assert(v, 404, "NOT_FOUND", "Proposal not found.");
    const { evidenceCipher, ...safe } = p;
    res.json({
      ...safe,
      ...(a.role !== "representative" && evidenceCipher
        ? { evidence: JSON.parse(decrypt(evidenceCipher, c.DATA_KEY)) }
        : {}),
    });
  });
  r.get("/review-queue", async (req, res) => {
    const a = principal(req);
    assert(
      a.role !== "representative",
      403,
      "SCOPE_DENIED",
      "Reviewer access required.",
    );
    const q = page.parse(req.query);
    const vs = await d.venues
      .find(venueScope(a, true), { projection: { _id: 1 } })
      .limit(2000)
      .toArray();
    const rows = await d.tasks
      .find({
        venueId: { $in: vs.map((v) => v._id) },
        state: "Open",
        ...(q.cursor ? { _id: { $gt: q.cursor } } : {}),
      })
      .sort({ _id: 1 })
      .limit(q.limit + 1)
      .toArray();
    res.json({
      items: rows.slice(0, q.limit),
      nextCursor: rows.length > q.limit ? rows[q.limit - 1]!._id : null,
    });
  });
  r.post("/proposals/:id/call-attempts", async (req, res) => {
    const pid = id.parse(req.params.id),
      x = evidence.parse(req.body);
    res.status(201).json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "call:" + pid,
        x,
        async (s, a) => {
          const p = await d.proposals.findOne(
            { _id: pid, state: "Submitted" },
            { session: s },
          );
          assert(p, 404, "NOT_FOUND", "Pending review not found.");
          const v = await d.venues.findOne({ _id: p.venueId }, { session: s });
          assert(
            v && reviews(a, v) && p.authorId !== a._id,
            403,
            "SCOPE_DENIED",
            "Independent review authority required.",
          );
          await d.venues.updateOne(
            { _id: v._id },
            { $inc: { writeFence: 1 } },
            { session: s },
          );
          const callId = randomUUID();
          await d.db
            .collection<{
              _id: string;
              proposalId: string;
              version: number;
              actorId: string;
              evidenceCipher: string;
              createdAt: Date;
            }>("callAttempts")
            .insertOne(
              {
                _id: callId,
                proposalId: pid,
                version: p.version,
                actorId: a._id,
                evidenceCipher: encrypt(JSON.stringify(x), c.DATA_KEY),
                createdAt: new Date(),
              },
              { session: s },
            );
          await audit(d, s, a._id, "Call attempt recorded", pid, v._id);
          return { id: callId, state: "Submitted" };
        },
      ),
    );
  });
  r.post("/venues/:id/reconfirm", async (req, res) => {
    const vid = id.parse(req.params.id),
      x = z
        .object({ revision: z.number().int(), reason: text.min(5) })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "reconfirm:" + vid,
        x,
        async (s, a) => {
          const v = await d.venues.findOne({ _id: vid }, { session: s });
          assert(
            v && manages(a, v) && v.revision === x.revision,
            409,
            "VERSION_CONFLICT",
            "Reload an authorized venue.",
          );
          await d.venues.updateOne(
            { _id: vid, revision: x.revision },
            { $set: { reconfirmedAt: new Date() }, $inc: { revision: 1 } },
            { session: s },
          );
          await audit(
            d,
            s,
            a._id,
            "Representative unchanged confirmation",
            vid,
            vid,
          );
          return { revision: x.revision + 1, reconfirmedAt: new Date() };
        },
      ),
    );
  });
  const registration = z
    .object({
      relationship: text.optional(),
      name: text,
      urdu: text,
      areaId: id,
      address: text,
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      kind: z.enum(["Mosque", "Prayer ground"]),
      parentVenueId: id.optional(),
      facilities: z.record(z.enum(["Available", "Unavailable", "Unknown"])),
      initial: snapshot,
      imam: z
        .object({
          name: text,
          contactNumber: phone,
          permission: z.literal(true),
        })
        .strict(),
    })
    .strict();
  r.post("/registrations", async (req, res) => {
    const x = registration.parse(req.body);
    res.status(201).json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "registration",
        x,
        async (s, a) => {
          const area = await d.areas.findOne({ _id: x.areaId }, { session: s });
          assert(
            area && (a.role === "admin" || a.areaIds.includes(area._id)),
            403,
            "SCOPE_DENIED",
            "Area access denied.",
          );
          if (x.kind === "Prayer ground")
            assert(
              x.parentVenueId &&
                (await d.venues.findOne(
                  { _id: x.parentVenueId, areaId: x.areaId },
                  { session: s },
                )),
              422,
              "PARENT_REQUIRED",
              "Select an associated mosque in this area.",
            );
          const vid = randomUUID();
          await d.venues.insertOne(
            {
              _id: vid,
              name: x.name,
              urdu: x.urdu,
              areaId: area._id,
              city: area.city,
              address: x.address,
              entrance: { type: "Point", coordinates: [x.lng, x.lat] },
              kind: x.kind,
              parentVenueId: x.parentVenueId,
              facilities: x.facilities,
              status: "Draft",
              registrationState: "Submitted",
              registrationRelationship: x.relationship,
              repId: a.role === "representative" ? a._id : null,
              focalId: area.focalId,
              revision: 0,
              authorId: a._id,
              initial: x.initial,
              createdAt: new Date(),
            },
            { session: s },
          );
          await d.contacts.insertOne(
            {
              _id: randomUUID(),
              venueId: vid,
              nameCipher: encrypt(x.imam.name, c.DATA_KEY),
              phoneCipher: encrypt(x.imam.contactNumber, c.DATA_KEY),
              permission: true,
            },
            { session: s },
          );
          await d.tasks.insertOne(
            {
              _id: randomUUID(),
              recordId: vid,
              venueId: vid,
              kind: "Registration",
              state: "Open",
              createdAt: new Date(),
            },
            { session: s },
          );
          await audit(d, s, a._id, "Registration submitted", vid, vid);
          return { id: vid, status: "Draft" };
        },
      ),
    );
  });
  r.post("/registrations/:id/resubmit", async (req, res) => {
    const vid = id.parse(req.params.id);
    const x = registration
      .extend({ revision: z.number().int().nonnegative() })
      .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "registration-resubmit:" + vid,
        x,
        async (s, a) => {
          const v = await d.venues.findOne({ _id: vid }, { session: s });
          assert(
            v && manages(a, v) && (v.repId === a._id || v.authorId === a._id),
            403,
            "SCOPE_DENIED",
            "Only the assigned representative or authorized submitter can resubmit.",
          );
          const previous = await d.db
            .collection("registrationDecisions")
            .findOne({ venueId: vid }, { session: s, sort: { at: -1 } });
          assert(
            v.status === "Draft" &&
              v.revision === x.revision &&
              (v.registrationState ?? previous?.decision) === "Returned",
            409,
            "VERSION_CONFLICT",
            "Only an unchanged returned registration can be resubmitted. Refresh and review its current state.",
          );
          assert(
            x.areaId === v.areaId,
            422,
            "AREA_CHANGE_DENIED",
            "The registration area cannot be changed during resubmission.",
          );
          if (x.kind === "Prayer ground")
            assert(
              x.parentVenueId &&
                x.parentVenueId !== vid &&
                (await d.venues.findOne(
                  { _id: x.parentVenueId, areaId: v.areaId, kind: "Mosque" },
                  { session: s },
                )),
              422,
              "PARENT_REQUIRED",
              "Select an associated mosque in this area.",
            );
          const contact = await d.contacts.findOne(
            { venueId: vid },
            { session: s },
          );
          assert(
            contact,
            409,
            "CONTACT_MISSING",
            "The registration contact is missing.",
          );
          // Keep the prior private snapshot encrypted; decisions remain append-only.
          await d.db.collection("registrationRevisions").insertOne(
            {
              venueId: vid,
              revision: v.revision,
              actorId: a._id,
              at: new Date(),
              snapshotCipher: encrypt(
                JSON.stringify({ venue: v, contact }),
                c.DATA_KEY,
              ),
            },
            { session: s },
          );
          await d.venues.updateOne(
            { _id: vid, revision: x.revision },
            {
              $set: {
                name: x.name,
                urdu: x.urdu,
                address: x.address,
                entrance: { type: "Point", coordinates: [x.lng, x.lat] },
                kind: x.kind,
                facilities: x.facilities,
                initial: x.initial,
                ...(x.kind === "Prayer ground"
                  ? { parentVenueId: x.parentVenueId }
                  : {}),
                registrationState: "Submitted",
                authorId: a._id,
                registrationRelationship:
                  x.relationship || v.registrationRelationship,
              },
              $unset: {
                identityApprovedAt: "",
                ...(x.kind === "Mosque" ? { parentVenueId: "" } : {}),
              },
              $inc: { revision: 1 },
            },
            { session: s },
          );
          await d.contacts.updateOne(
            { _id: contact._id },
            {
              $set: {
                nameCipher: encrypt(x.imam.name, c.DATA_KEY),
                phoneCipher: encrypt(x.imam.contactNumber, c.DATA_KEY),
                permission: true,
              },
              $unset: { verifiedAt: "" },
            },
            { session: s },
          );
          await d.tasks.updateOne(
            { recordId: vid },
            {
              $set: { kind: "Registration", state: "Open" },
              $setOnInsert: {
                _id: randomUUID(),
                venueId: vid,
                createdAt: new Date(),
              },
            },
            { session: s, upsert: true },
          );
          await audit(d, s, a._id, "Registration resubmitted", vid, vid);
          if (v.focalId !== a._id)
            await notify(
              d,
              s,
              v.focalId,
              "Registration resubmitted for review",
              "/manage/requests/" + vid,
            );
          return { id: vid, status: "Submitted", revision: x.revision + 1 };
        },
      ),
    );
  });
  r.post("/registrations/:id/decision", async (req, res) => {
    const vid = id.parse(req.params.id),
      x = z
        .object({
          revision: z.number().int(),
          decision: z.enum(["Approved", "Returned", "Rejected"]),
          reason: text.min(5),
          checks: z
            .object({
              identity: z.literal(true),
              entrance: z.literal(true),
              relationship: z.literal(true),
              contactAuthority: z.literal(true),
            })
            .strict()
            .optional(),
          evidence: evidence.optional(),
        })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "registration-decision:" + vid,
        x,
        async (s, a) => {
          const v = await d.venues.findOne({ _id: vid }, { session: s });
          assert(
            v && reviews(a, v) && v.authorId !== a._id,
            403,
            "SCOPE_DENIED",
            "Independent reviewer required.",
          );
          const previous = await d.db
            .collection("registrationDecisions")
            .findOne({ venueId: vid }, { session: s, sort: { at: -1 } });
          assert(
            v.status === "Draft" &&
              v.revision === x.revision &&
              (v.registrationState ?? previous?.decision ?? "Submitted") ===
                "Submitted",
            409,
            "VERSION_CONFLICT",
            "Registration changed.",
          );
          if (x.decision === "Approved") {
            assert(
              x.checks &&
                x.evidence?.outcome === "Confirmed as submitted" &&
                v.repId &&
                v.focalId,
              422,
              "CHECKS_REQUIRED",
              "Complete identity, contact, timetable and assignment checks.",
            );
            const count = await d.accounts.countDocuments(
              { _id: { $in: [v.repId, v.focalId] }, active: true },
              { session: s },
            );
            assert(
              count === 2,
              422,
              "MAINTAINERS_REQUIRED",
              "Two active independent maintainers are required.",
            );
            await d.contacts.updateOne(
              { venueId: vid },
              { $set: { verifiedAt: new Date() } },
              { session: s },
            );
          }
          await d.venues.updateOne(
            { _id: vid, revision: x.revision },
            {
              $set: {
                status: x.decision === "Approved" ? "Published" : "Draft",
                registrationState: x.decision,
                ...(x.decision === "Approved"
                  ? { identityApprovedAt: new Date() }
                  : {}),
              },
              $inc: { revision: 1 },
            },
            { session: s },
          );
          await d.db.collection("registrationDecisions").insertOne(
            {
              venueId: vid,
              actorId: a._id,
              decision: x.decision,
              reason: x.reason,
              evidenceCipher: encrypt(JSON.stringify(x), c.DATA_KEY),
              at: new Date(),
            },
            { session: s },
          );
          await d.tasks.updateOne(
            { recordId: vid, kind: "Registration", state: "Open" },
            { $set: { state: "Closed" } },
            { session: s },
          );
          await audit(d, s, a._id, "Registration " + x.decision, vid, vid);
          return { id: vid, state: x.decision };
        },
      ),
    );
  });
  return r;
}
