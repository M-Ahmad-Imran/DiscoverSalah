import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import { principal } from "../../middleware/security.js";
import { id, text, phone, evidence } from "../../lib/validation.js";
import { assert } from "../../lib/errors.js";
import { command, audit, notify } from "../../lib/commands.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { manages, reviews } from "./policies.js";

export interface Change {
  _id: string;
  venueId: string;
  authorId: string;
  kind: "profile-change" | "contact-change";
  state: "Submitted" | "Approved" | "Returned" | "Rejected";
  revision: number;
  contentCipher: string;
  createdAt: Date;
  decisionCipher?: string;
}
const content = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("profile-change"),
      name: text,
      address: text,
      facilities: z.record(z.enum(["Available", "Unavailable", "Unknown"])),
      reason: text.min(5),
    })
    .strict(),
  z
    .object({
      kind: z.literal("contact-change"),
      name: text,
      phone,
      reference: text.min(5),
      consent: z.literal(true),
      reason: text.min(5),
    })
    .strict(),
]);
export function changeRoutes(d: Database, c: Config) {
  const r = Router(),
    changes = d.db.collection<Change>("venueChanges");
  r.post("/venues/:id/changes", async (req, res) => {
    const vid = id.parse(req.params.id),
      x = z
        .object({ revision: z.number().int(), content })
        .strict()
        .parse(req.body);
    res.status(201).json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "change:" + vid,
        x,
        async (s, a) => {
          const v = await d.venues.findOne({ _id: vid }, { session: s });
          assert(
            v && manages(a, v),
            403,
            "SCOPE_DENIED",
            "Venue access denied.",
          );
          assert(
            v.revision === x.revision,
            409,
            "VERSION_CONFLICT",
            "Reload the venue.",
          );
          const cid = randomUUID();
          await changes.insertOne(
            {
              _id: cid,
              venueId: vid,
              authorId: a._id,
              kind: x.content.kind,
              state: "Submitted",
              revision: 0,
              contentCipher: encrypt(JSON.stringify(x.content), c.DATA_KEY),
              createdAt: new Date(),
            },
            { session: s },
          );
          await d.venues.updateOne(
            { _id: vid },
            { $inc: { revision: 1 } },
            { session: s },
          );
          await d.tasks.insertOne(
            {
              _id: randomUUID(),
              venueId: vid,
              recordId: cid,
              kind: x.content.kind,
              state: "Open",
              createdAt: new Date(),
            },
            { session: s },
          );
          await audit(d, s, a._id, "Venue change submitted", cid, vid);
          await notify(
            d,
            s,
            v.focalId,
            "Venue information awaiting review",
            "/manage/requests/" + cid,
          );
          return { id: cid };
        },
      ),
    );
  });
  r.post("/changes/:id/decision", async (req, res) => {
    const cid = id.parse(req.params.id),
      x = z
        .object({
          revision: z.number().int(),
          venueRevision: z.number().int(),
          decision: z.enum(["Approved", "Returned", "Rejected"]),
          reason: text.min(5),
          evidence: evidence.optional(),
          independentAuthority: text.min(5).optional(),
        })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "change-decision:" + cid,
        x,
        async (s, a) => {
          const change = await changes.findOne({ _id: cid }, { session: s });
          assert(change, 404, "NOT_FOUND", "Change not found.");
          const v = await d.venues.findOne(
            { _id: change.venueId },
            { session: s },
          );
          assert(
            v && reviews(a, v) && change.authorId !== a._id,
            403,
            "SELF_REVIEW",
            "Independent reviewer required.",
          );
          assert(
            change.state === "Submitted" &&
              change.revision === x.revision &&
              v.revision === x.venueRevision,
            409,
            "VERSION_CONFLICT",
            "Reload the exact change and venue.",
          );
          const proposed = content.parse(
            JSON.parse(decrypt(change.contentCipher, c.DATA_KEY)),
          );
          if (x.decision === "Approved") {
            assert(
              x.evidence?.outcome === "Confirmed as submitted" &&
                x.independentAuthority,
              422,
              "EVIDENCE_REQUIRED",
              "Record confirmation with an established independent authority.",
            );
            if (proposed.kind === "contact-change")
              await d.contacts.updateOne(
                { venueId: v._id },
                {
                  $set: {
                    phoneCipher: encrypt(proposed.phone, c.DATA_KEY),
                    nameCipher: encrypt(proposed.name, c.DATA_KEY),
                    permission: true,
                    verifiedAt: new Date(),
                  },
                },
                { session: s },
              );
            else
              await d.venues.updateOne(
                { _id: v._id },
                {
                  $set: {
                    name: proposed.name,
                    address: proposed.address,
                    facilities: proposed.facilities,
                  },
                },
                { session: s },
              );
          }
          await d.venues.updateOne(
            { _id: v._id },
            { $inc: { revision: 1 } },
            { session: s },
          );
          await changes.updateOne(
            { _id: cid },
            {
              $set: {
                state: x.decision,
                decisionCipher: encrypt(
                  JSON.stringify({ ...x, reviewer: a._id, at: new Date() }),
                  c.DATA_KEY,
                ),
              },
              $inc: { revision: 1 },
            },
            { session: s },
          );
          await d.tasks.updateOne(
            { recordId: cid },
            { $set: { state: "Closed" } },
            { session: s },
          );
          await audit(d, s, a._id, "Venue change " + x.decision, cid, v._id);
          return { id: cid, state: x.decision };
        },
      ),
    );
  });
  r.post("/venues/:id/status", async (req, res) => {
    const vid = id.parse(req.params.id),
      x = z
        .object({
          revision: z.number().int(),
          status: z.enum(["Suspended", "Published", "Maintenance pending"]),
          reason: text.min(5),
        })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "venue-status:" + vid,
        x,
        async (s, a) => {
          assert(
            a.role === "admin",
            403,
            "ADMIN_REQUIRED",
            "Administrator required.",
          );
          const v = await d.venues.findOne(
            { _id: vid, revision: x.revision },
            { session: s },
          );
          assert(
            v && v.status !== "Draft",
            409,
            "VERSION_CONFLICT",
            "Reload an independently registered venue.",
          );
          if (x.status === "Published") {
            assert(
              v.identityApprovedAt && v.repId && v.focalId,
              422,
              "MAINTAINERS_REQUIRED",
              "Independent registration and both maintainers required.",
            );
            assert(
              (await d.accounts.countDocuments(
                { _id: { $in: [v.repId, v.focalId] }, active: true },
                { session: s },
              )) === 2,
              422,
              "MAINTAINERS_REQUIRED",
              "Both maintainers must be active.",
            );
          }
          await d.venues.updateOne(
            { _id: vid },
            { $set: { status: x.status }, $inc: { revision: 1 } },
            { session: s },
          );
          await audit(d, s, a._id, "Venue status " + x.status, vid, vid);
          return { id: vid };
        },
      ),
    );
  });
  r.post("/duplicates", async (req, res) => {
    const x = z
      .object({
        primaryId: id,
        duplicateId: id,
        primaryRevision: z.number().int(),
        duplicateRevision: z.number().int(),
        reason: text.min(5),
      })
      .strict()
      .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "duplicate",
        x,
        async (s, a) => {
          assert(
            a.role === "admin" && x.primaryId !== x.duplicateId,
            403,
            "ADMIN_REQUIRED",
            "Administrator and two different venues required.",
          );
          for (const [vid, revision] of [
            [x.primaryId, x.primaryRevision],
            [x.duplicateId, x.duplicateRevision],
          ] as const) {
            const result = await d.venues.updateOne(
              { _id: vid, revision },
              { $inc: { revision: 1 } },
              { session: s },
            );
            assert(
              result.modifiedCount,
              409,
              "VERSION_CONFLICT",
              "Reload both venues.",
            );
          }
          await d.db
            .collection("duplicateAssessments")
            .insertOne(
              { ...x, actorId: a._id, createdAt: new Date() },
              { session: s },
            );
          await audit(
            d,
            s,
            a._id,
            "Duplicate assessment recorded",
            x.duplicateId,
            x.primaryId,
          );
          return { id: x.duplicateId };
        },
      ),
    );
  });
  r.post("/proposals/:id/escalate", async (req, res) => {
    const pid = id.parse(req.params.id),
      x = z
        .object({ reason: text.min(5) })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "escalate:" + pid,
        x,
        async (s, a) => {
          const p = await d.proposals.findOne(
              { _id: pid, state: "Submitted" },
              { session: s },
            ),
            v = p
              ? await d.venues.findOne({ _id: p.venueId }, { session: s })
              : null;
          assert(
            p && v && reviews(a, v),
            403,
            "SCOPE_DENIED",
            "Reviewer access required.",
          );
          await d.venues.updateOne(
            { _id: v._id },
            { $inc: { writeFence: 1 } },
            { session: s },
          );
          await audit(d, s, a._id, "Review escalated", pid, v._id);
          await d.db
            .collection("escalations")
            .insertOne(
              {
                proposalId: pid,
                reasonCipher: encrypt(x.reason, c.DATA_KEY),
                actorId: a._id,
                at: new Date(),
              },
              { session: s },
            );
          for await (const admin of d.accounts.find(
            { role: "admin", active: true },
            { session: s },
          ))
            await notify(
              d,
              s,
              admin._id,
              "Escalated timetable review",
              "/manage/review/" + pid,
            );
          return { id: pid };
        },
      ),
    );
  });
  return r;
}
