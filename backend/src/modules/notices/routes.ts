import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import { id, text, page } from "../../lib/validation.js";
import { assert } from "../../lib/errors.js";
import { command, audit } from "../../lib/commands.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { principal } from "../../middleware/security.js";
import { venueScope } from "../venues/routes.js";
import type { Notice } from "../../db/models.js";
function publicNotice(n: Notice) {
  return {
    id: n._id,
    venueId: n.venueId,
    title: n.title,
    body: n.body,
    category: n.category,
    event: n.event,
    expires: n.expires,
    state: n.state,
  };
}
const content = z
  .object({
    venueId: id,
    title: text,
    body: z.string().trim().min(5).max(3000),
    category: z.enum(["Religious event", "Mosque service", "Death / Janazah"]),
    event: z.string().datetime({ offset: true }),
    expires: z.string().datetime({ offset: true }),
    source: text.min(5),
    draft: z.boolean().default(false),
    replacesId: id.optional(),
  })
  .strict()
  .refine(
    (x) =>
      Date.parse(x.expires) > Date.parse(x.event) &&
      Date.parse(x.expires) > Date.now(),
    "Expiry must follow event and current time",
  );
export function noticePublic(d: Database) {
  const r = Router();
  r.get("/venues/:id/notices", async (req, res) => {
    const vid = id.parse(req.params.id);
    assert(
      await d.venues.findOne({
        _id: vid,
        status: { $in: ["Published", "Maintenance pending"] },
      }),
      404,
      "NOT_FOUND",
      "Venue not found.",
    );
    const rows = await d.notices
      .find({
        venueId: vid,
        state: "Published",
        expires: { $gt: new Date().toISOString() },
      })
      .sort({ _id: 1 })
      .limit(50)
      .toArray();
    res.json({ items: rows.map(publicNotice) });
  });
  r.get("/notices/:id", async (req, res) => {
    const n = await d.notices.findOne({
      _id: id.parse(req.params.id),
      state: "Published",
      expires: { $gt: new Date().toISOString() },
    });
    assert(
      n &&
        (await d.venues.findOne({
          _id: n.venueId,
          status: { $in: ["Published", "Maintenance pending"] },
        })),
      404,
      "NOT_FOUND",
      "Notice is not active.",
    );
    res.json(publicNotice(n));
  });
  return r;
}
export function noticeManagement(d: Database, c: Config) {
  const r = Router();
  r.get("/notices", async (req, res) => {
    const a = principal(req),
      q = page.parse(req.query);
    const vs = await d.venues
      .find(venueScope(a), { projection: { _id: 1 } })
      .limit(2000)
      .toArray();
    const rows = await d.notices
      .find({
        venueId: { $in: vs.map((v) => v._id) },
        ...(q.cursor ? { _id: { $gt: q.cursor } } : {}),
      })
      .sort({ _id: 1 })
      .limit(q.limit + 1)
      .toArray();
    res.json({
      items: rows.slice(0, q.limit).map((n) => ({
        ...publicNotice(n),
        revision: n.revision,
        source: decrypt(n.sourceCipher, c.DATA_KEY),
      })),
      nextCursor: rows.length > q.limit ? rows[q.limit - 1]!._id : null,
    });
  });
  r.post("/notices", async (req, res) => {
    const x = content.parse(req.body);
    res.status(201).json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "notice",
        x,
        async (s, a) => {
          const v = await d.venues.findOne(
            { _id: x.venueId, ...venueScope(a) },
            { session: s },
          );
          assert(v, 404, "NOT_FOUND", "Venue not found.");
          await d.venues.updateOne(
            { _id: v._id },
            { $inc: { revision: 1 } },
            { session: s },
          );
          if (x.replacesId)
            assert(
              await d.notices.findOne(
                { _id: x.replacesId, venueId: v._id },
                { session: s },
              ),
              404,
              "NOT_FOUND",
              "Previous notice not found.",
            );
          const nid = randomUUID();
          await d.notices.insertOne(
            {
              _id: nid,
              venueId: v._id,
              authorId: a._id,
              title: x.title,
              body: x.body,
              category: x.category,
              event: new Date(x.event).toISOString(),
              expires: new Date(x.expires).toISOString(),
              sourceCipher: encrypt(x.source, c.DATA_KEY),
              state: x.draft ? "Draft" : "Submitted",
              replacesId: x.replacesId,
              revision: 0,
              createdAt: new Date(),
            },
            { session: s },
          );
          if (!x.draft)
            await d.tasks.insertOne(
              {
                _id: randomUUID(),
                recordId: nid,
                venueId: v._id,
                kind: "Notice",
                state: "Open",
                createdAt: new Date(),
              },
              { session: s },
            );
          await audit(d, s, a._id, "Notice created", nid, v._id);
          return { id: nid, state: x.draft ? "Draft" : "Submitted" };
        },
      ),
    );
  });
  r.post("/notices/:id/decision", async (req, res) => {
    const nid = id.parse(req.params.id),
      x = z
        .object({
          revision: z.number().int(),
          decision: z.enum(["Published", "Returned", "Rejected", "Canceled"]),
          reason: text.min(5),
          sourcePrivacyChecked: z.boolean().optional(),
        })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "notice-decision:" + nid,
        x,
        async (s, a) => {
          const n = await d.notices.findOne({ _id: nid }, { session: s });
          assert(
            n &&
              (await d.venues.findOne(
                { _id: n.venueId, ...venueScope(a) },
                { session: s },
              )),
            404,
            "NOT_FOUND",
            "Notice not found.",
          );
          assert(
            n.revision === x.revision,
            409,
            "VERSION_CONFLICT",
            "Notice changed.",
          );
          if (x.decision !== "Canceled") {
            assert(
              a.role !== "representative" && n.authorId !== a._id,
              403,
              "SELF_REVIEW",
              "Independent moderator required.",
            );
            assert(
              n.state === "Submitted",
              409,
              "STATUS_CHANGED",
              "Only submitted notices can be reviewed.",
            );
          }
          if (x.decision === "Published") {
            assert(
              x.sourcePrivacyChecked && Date.parse(n.expires) > Date.now(),
              422,
              "NOTICE_CHECKS_REQUIRED",
              "Check source authority, consent, privacy and expiry.",
            );
            if (n.replacesId)
              await d.notices.updateOne(
                { _id: n.replacesId, venueId: n.venueId },
                { $set: { state: "Superseded" }, $inc: { revision: 1 } },
                { session: s },
              );
          }
          await d.venues.updateOne(
            { _id: n.venueId },
            { $inc: { revision: 1 } },
            { session: s },
          );
          await d.notices.updateOne(
            { _id: nid },
            { $set: { state: x.decision }, $inc: { revision: 1 } },
            { session: s },
          );
          await d.tasks.updateOne(
            { recordId: nid },
            { $set: { state: "Closed" } },
            { session: s },
          );
          await audit(d, s, a._id, "Notice " + x.decision, nid, n.venueId);
          return { id: nid, state: x.decision };
        },
      ),
    );
  });
  return r;
}
