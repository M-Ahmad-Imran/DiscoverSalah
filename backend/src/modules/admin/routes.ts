import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import { id, text, phone, page } from "../../lib/validation.js";
import { assert } from "../../lib/errors.js";
import { token, digest, keyed, encrypt, decrypt } from "../../lib/crypto.js";
import { command, audit, notify } from "../../lib/commands.js";
import { principal } from "../../middleware/security.js";
import { venueScope } from "../venues/routes.js";
export function adminRoutes(d: Database, c: Config) {
  const r = Router();
  r.post("/notifications/read-all", async (req, res) => {
    await d.notifications.updateMany(
      { accountId: principal(req)._id, read: false },
      { $set: { read: true } },
    );
    res.status(204).end();
  });
  r.post("/delivery/:id/escalate", async (req, res) => {
    const oid = id.parse(req.params.id),
      x = z
        .object({ reason: text.min(5) })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "delivery-escalation:" + oid,
        x,
        async (s, a) => {
          assert(
            a.role === "admin",
            403,
            "ADMIN_REQUIRED",
            "Administrator required.",
          );
          assert(
            await d.outbox.findOne(
              { _id: oid, state: "failed" },
              { session: s },
            ),
            404,
            "NOT_FOUND",
            "Failed delivery not found.",
          );
          await d.db
            .collection("deliveryEscalations")
            .insertOne(
              {
                outboxId: oid,
                reasonCipher: encrypt(x.reason, c.DATA_KEY),
                actorId: a._id,
                at: new Date(),
              },
              { session: s },
            );
          await audit(d, s, a._id, "Delivery failure escalated", oid);
          return { id: oid };
        },
      ),
    );
  });
  r.get("/accounts", async (req, res) => {
    const a = principal(req);
    assert(
      a.role !== "representative",
      403,
      "SCOPE_DENIED",
      "Management authority required.",
    );
    const q = page.parse(req.query);
    const rows = await d.accounts
      .find(
        {
          ...(a.role === "admin"
            ? {}
            : { role: "representative" as const, areaIds: { $in: a.areaIds } }),
          ...(q.cursor ? { _id: { $gt: q.cursor } } : {}),
        },
        {
          projection: {
            _id: 1,
            name: 1,
            role: 1,
            areaIds: 1,
            active: 1,
            authVersion: 1,
            contactVerifiedAt: 1,
          },
        },
      )
      .sort({ _id: 1 })
      .limit(q.limit + 1)
      .toArray();
    res.json({
      items: rows.slice(0, q.limit),
      nextCursor: rows.length > q.limit ? rows[q.limit - 1]!._id : null,
    });
  });
  r.post("/invitations", (_req, res) =>
    res
      .status(410)
      .json({
        error: {
          code: "USE_CREDENTIALS",
          message:
            "Use issuer-created credentials. OTP invitations are retired.",
        },
      }),
  );
  r.post("/accounts/:id/deactivate", async (req, res) => {
    const accountId = id.parse(req.params.id),
      x = z
        .object({ reason: text.min(5), authVersion: z.number().int() })
        .strict()
        .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "deactivate:" + accountId,
        x,
        async (s, a) => {
          assert(
            a._id !== accountId,
            409,
            "SELF_DEACTIVATION",
            "Use another administrator for this operation.",
          );
          const target = await d.accounts.findOne(
            { _id: accountId },
            { session: s },
          );
          assert(
            target &&
              (a.role === "admin" ||
                (a.role === "focal" &&
                  target.role === "representative" &&
                  target.areaIds.every((v) => a.areaIds.includes(v)))),
            403,
            "SCOPE_DENIED",
            "Account access denied.",
          );
          const changed = await d.accounts.updateOne(
            { _id: accountId, authVersion: x.authVersion },
            { $set: { active: false }, $inc: { authVersion: 1, fence: 1 } },
            { session: s },
          );
          assert(
            changed.modifiedCount,
            409,
            "ACCOUNT_CHANGED",
            "Reload the account.",
          );
          await d.sessions.deleteMany({ accountId }, { session: s });
          await d.tokens.deleteMany({ accountId }, { session: s });
          await d.venues.updateMany(
            {
              status: "Published",
              $or: [{ repId: accountId }, { focalId: accountId }],
            },
            { $set: { status: "Maintenance pending" }, $inc: { revision: 1 } },
            { session: s },
          );
          await d.venues.updateMany(
            { repId: accountId },
            { $set: { repId: null }, $inc: { revision: 1 } },
            { session: s },
          );
          await d.venues.updateMany(
            { focalId: accountId },
            { $set: { focalId: null }, $inc: { revision: 1 } },
            { session: s },
          );
          await d.venues.updateMany(
            { "backup.reviewerId": accountId },
            { $unset: { backup: "" }, $inc: { revision: 1 } },
            { session: s },
          );
          await d.areas.updateMany(
            { focalId: accountId },
            { $set: { focalId: null }, $inc: { revision: 1 } },
            { session: s },
          );
          await audit(d, s, a._id, "Account deactivated", accountId);
          return { id: accountId, active: false };
        },
      ),
    );
  });
  r.post("/areas", async (req, res) => {
    const x = z.object({ name: text, city: text }).strict().parse(req.body);
    res.status(201).json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "area",
        x,
        async (s, a) => {
          assert(
            a.role === "admin",
            403,
            "ADMIN_REQUIRED",
            "Administrator required.",
          );
          const aid = randomUUID();
          await d.areas.insertOne(
            { _id: aid, ...x, focalId: null, revision: 0 },
            { session: s },
          );
          await audit(d, s, a._id, "Area created", aid);
          return { id: aid };
        },
      ),
    );
  });
  r.post("/assignments", async (req, res) => {
    const x = z
      .object({
        operation: z.enum([
          "representative",
          "focal",
          "backup",
          "revoke-backup",
        ]),
        targetId: id,
        assigneeId: id.optional(),
        expectedRevision: z.number().int().nonnegative(),
        reason: text.min(5),
        startsAt: z.string().datetime({ offset: true }).optional(),
        endsAt: z.string().datetime({ offset: true }).optional(),
      })
      .strict()
      .parse(req.body);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "assignment",
        x,
        async (s, a) => {
          assert(
            a.role === "admin" ||
              (a.role === "focal" && x.operation === "representative"),
            403,
            "SCOPE_DENIED",
            "Assignment operation is not permitted.",
          );
          const assignee = x.assigneeId
            ? await d.accounts.findOneAndUpdate(
                { _id: x.assigneeId, active: true },
                { $inc: { fence: 1 } },
                { session: s, returnDocument: "after" },
              )
            : null;
          if (x.operation !== "revoke-backup")
            assert(
              assignee,
              422,
              "ASSIGNEE_REQUIRED",
              "Choose an active account.",
            );
          if (x.operation === "focal") {
            assert(
              assignee?.role === "focal",
              422,
              "ROLE_MISMATCH",
              "Choose a focal person.",
            );
            const area = await d.areas.findOne(
              { _id: x.targetId, revision: x.expectedRevision },
              { session: s },
            );
            assert(area, 409, "VERSION_CONFLICT", "Area changed.");
            await d.areas.updateOne(
              { _id: area._id },
              { $set: { focalId: assignee._id }, $inc: { revision: 1 } },
              { session: s },
            );
            await d.accounts.updateMany(
              { role: "focal", areaIds: area._id },
              { $pull: { areaIds: area._id }, $inc: { fence: 1 } },
              { session: s },
            );
            await d.accounts.updateOne(
              { _id: assignee._id },
              { $addToSet: { areaIds: area._id }, $inc: { fence: 1 } },
              { session: s },
            );
            await d.venues.updateMany(
              { areaId: area._id },
              { $set: { focalId: assignee._id }, $inc: { revision: 1 } },
              { session: s },
            );
            await notify(
              d,
              s,
              assignee._id,
              "Area responsibility assigned",
              "/manage/reviews",
            );
          } else {
            const v = await d.venues.findOne(
              {
                _id: x.targetId,
                ...venueScope(a),
                revision: x.expectedRevision,
              },
              { session: s },
            );
            assert(v, 409, "VERSION_CONFLICT", "Reload an authorized venue.");
            if (x.operation === "representative") {
              assert(
                assignee?.role === "representative" &&
                  assignee.areaIds.includes(v.areaId),
                422,
                "ROLE_MISMATCH",
                "Choose a representative assigned to this area.",
              );
              await d.venues.updateOne(
                { _id: v._id },
                { $set: { repId: assignee._id }, $inc: { revision: 1 } },
                { session: s },
              );
              await notify(
                d,
                s,
                assignee._id,
                "Mosque responsibility assigned",
                "/manage/mosques/" + v._id,
              );
            } else if (x.operation === "backup") {
              assert(
                assignee?.role === "focal" &&
                  x.startsAt &&
                  x.endsAt &&
                  Date.parse(x.endsAt) > Date.parse(x.startsAt) &&
                  Date.parse(x.endsAt) > Date.now(),
                422,
                "INVALID_BACKUP",
                "Choose an active focal person and a valid future-ending coverage window.",
              );
              await d.venues.updateOne(
                { _id: v._id },
                {
                  $set: {
                    backup: {
                      reviewerId: assignee._id,
                      startsAt: new Date(x.startsAt),
                      endsAt: new Date(x.endsAt),
                    },
                  },
                  $inc: { revision: 1 },
                },
                { session: s },
              );
            } else
              await d.venues.updateOne(
                { _id: v._id },
                { $unset: { backup: "" }, $inc: { revision: 1 } },
                { session: s },
              );
          }
          await audit(
            d,
            s,
            a._id,
            "Assignment " + x.operation,
            x.targetId,
            x.operation === "focal" ? undefined : x.targetId,
          );
          return { targetId: x.targetId, operation: x.operation };
        },
      ),
    );
  });
  r.get("/notifications", async (req, res) => {
    const q = page.parse(req.query);
    const rows = await d.notifications
      .find({
        accountId: principal(req)._id,
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
  r.post("/notifications/:id/read", async (req, res) => {
    const result = await d.notifications.updateOne(
      { _id: id.parse(req.params.id), accountId: principal(req)._id },
      { $set: { read: true } },
    );
    assert(result.matchedCount, 404, "NOT_FOUND", "Notification not found.");
    res.status(204).end();
  });
  r.get("/audit", async (req, res) => {
    const a = principal(req),
      q = page.parse(req.query);
    const vs = await d.venues
      .find(venueScope(a), { projection: { _id: 1 } })
      .limit(2000)
      .toArray();
    const rows = await d.audit
      .find({
        ...(a.role === "admin"
          ? {}
          : { venueId: { $in: vs.map((v) => v._id) } }),
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
  r.get("/delivery", async (req, res) => {
    assert(
      principal(req).role === "admin",
      403,
      "ADMIN_REQUIRED",
      "Administrator required.",
    );
    const q = page.parse(req.query);
    const rows = await d.outbox
      .find({
        state: "failed",
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
  r.post("/delivery/:id/retry", async (req, res) => {
    const oid = id.parse(req.params.id);
    res.json(
      await command(
        d,
        principal(req),
        req.get("idempotency-key"),
        "retry:" + oid,
        {},
        async (s, a) => {
          assert(
            a.role === "admin",
            403,
            "ADMIN_REQUIRED",
            "Administrator required.",
          );
          const result = await d.outbox.updateOne(
            { _id: oid, state: "failed" },
            {
              $set: { state: "pending", availableAt: new Date(), attempts: 0 },
              $unset: { leaseToken: "", leaseUntil: "" },
            },
            { session: s },
          );
          assert(
            result.modifiedCount,
            409,
            "NOT_FAILED",
            "Only failed deliveries may be retried.",
          );
          await audit(d, s, a._id, "Delivery retry requested", oid);
          return { id: oid, state: "pending" };
        },
      ),
    );
  });
  return r;
}
