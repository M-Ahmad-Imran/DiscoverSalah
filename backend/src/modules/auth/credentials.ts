import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import type { Account } from "../../db/models.js";
import { principal, rateLimit } from "../../middleware/security.js";
import { id, phone, text } from "../../lib/validation.js";
import { assert } from "../../lib/errors.js";
import { audit, command } from "../../lib/commands.js";
import {
  token,
  encrypt,
  decrypt,
  hashPassword,
  keyed,
} from "../../lib/crypto.js";

function canIssue(actor: Account, role: Account["role"], areas: string[]) {
  return (
    (actor.role === "admin" && role === "focal") ||
    (actor.role === "focal" &&
      role === "representative" &&
      areas.length > 0 &&
      areas.every((area) => actor.areaIds.includes(area)))
  );
}

export function credentialRoutes(d: Database, c: Config) {
  const r = Router();
  const issuanceLimit = rateLimit(
    d,
    c,
    "credential-issuance",
    20,
    900,
    (req) => principal(req)._id,
  );
  r.post("/credentials", issuanceLimit, async (req, res) => {
    const x = z
      .object({
        name: text,
        contactNumber: phone,
        role: z.enum(["focal", "representative"]),
        areaIds: z.array(id).min(1).max(20),
        contactConfirmed: z.literal(true),
        reason: text.min(5),
      })
      .strict()
      .parse(req.body);
    assert(
      canIssue(principal(req), x.role, x.areaIds),
      403,
      "ISSUER_SCOPE_DENIED",
      "You cannot issue credentials for this role or area.",
    );
    const temporaryPassword = token();
    const passwordHash = await hashPassword(temporaryPassword);
    const result = await command(
      d,
      principal(req),
      req.get("idempotency-key"),
      "credentials",
      x,
      async (session, a) => {
        assert(
          canIssue(a, x.role, x.areaIds),
          403,
          "ISSUER_SCOPE_DENIED",
          "Only admin creates focal credentials; only the area's focal person creates representative credentials.",
        );
        assert(
          (await d.areas.countDocuments(
            { _id: { $in: x.areaIds } },
            { session },
          )) === new Set(x.areaIds).size,
          422,
          "UNKNOWN_AREA",
          "Choose existing areas.",
        );
        if (a.role === "focal")
          assert(
            (await d.areas.countDocuments(
              { _id: { $in: x.areaIds }, focalId: a._id },
              { session },
            )) === new Set(x.areaIds).size,
            403,
            "ISSUER_SCOPE_DENIED",
            "Current area responsibility is required.",
          );
        const accountId = randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 3600000);
        await d.accounts.insertOne(
          {
            _id: accountId,
            name: x.name,
            role: x.role,
            areaIds: x.areaIds,
            active: true,
            phoneHash: keyed(x.contactNumber, c.TOKEN_KEY),
            phoneCipher: encrypt(x.contactNumber, c.DATA_KEY),
            contactConfirmedAt: new Date(),
            contactConfirmedBy: a._id,
            passwordHash,
            mustChangePassword: true,
            temporaryPasswordExpiresAt: expiresAt,
            authVersion: 0,
            fence: 0,
            createdAt: new Date(),
          },
          { session },
        );
        await audit(
          d,
          session,
          a._id,
          "Credentials issued; contact confirmed by issuer",
          accountId,
        );
        return {
          id: accountId,
          secretCipher: encrypt(temporaryPassword, c.DATA_KEY),
          expiresAt,
        };
      },
    );
    assert(
      new Date(result.expiresAt) > new Date(),
      410,
      "CREDENTIALS_EXPIRED",
      "Issue a new temporary password.",
    );
    const { secretCipher, ...safe } = result;
    res
      .status(201)
      .json({ ...safe, temporaryPassword: decrypt(secretCipher, c.DATA_KEY) });
  });
  r.post("/accounts/:id/reset-credentials", issuanceLimit, async (req, res) => {
    const accountId = id.parse(req.params.id);
    const x = z
      .object({
        authVersion: z.number().int(),
        reason: text.min(5),
        contactConfirmed: z.literal(true),
      })
      .strict()
      .parse(req.body);
    const temporaryPassword = token(),
      passwordHash = await hashPassword(temporaryPassword);
    const result = await command(
      d,
      principal(req),
      req.get("idempotency-key"),
      "reset-credentials:" + accountId,
      x,
      async (session, a) => {
        const target = await d.accounts.findOne(
          { _id: accountId, active: true },
          { session },
        );
        assert(
          target && canIssue(a, target.role, target.areaIds),
          403,
          "ISSUER_SCOPE_DENIED",
          "Only the authorized issuer can reset these credentials.",
        );
        const expiresAt = new Date(Date.now() + 24 * 3600000);
        const changed = await d.accounts.updateOne(
          { _id: accountId, authVersion: x.authVersion },
          {
            $set: {
              passwordHash,
              mustChangePassword: true,
              temporaryPasswordExpiresAt: expiresAt,
              contactConfirmedAt: new Date(),
              contactConfirmedBy: a._id,
            },
            $inc: { authVersion: 1, fence: 1 },
          },
          { session },
        );
        assert(
          changed.modifiedCount,
          409,
          "ACCOUNT_CHANGED",
          "Reload this account.",
        );
        await d.sessions.deleteMany({ accountId }, { session });
        await d.tokens.deleteMany({ accountId }, { session });
        await audit(
          d,
          session,
          a._id,
          "Credentials reset; all sessions revoked",
          accountId,
        );
        return {
          id: accountId,
          secretCipher: encrypt(temporaryPassword, c.DATA_KEY),
          expiresAt,
        };
      },
    );
    assert(
      new Date(result.expiresAt) > new Date(),
      410,
      "CREDENTIALS_EXPIRED",
      "Issue a new temporary password.",
    );
    const { secretCipher, ...safe } = result;
    res.json({ ...safe, temporaryPassword: decrypt(secretCipher, c.DATA_KEY) });
  });
  r.post("/accounts/:id/contact", issuanceLimit, async (req, res) => {
    const accountId = id.parse(req.params.id);
    const x = z
      .object({
        authVersion: z.number().int(),
        contactNumber: phone,
        contactConfirmed: z.literal(true),
        reason: text.min(5),
      })
      .strict()
      .parse(req.body);
    const result = await command(
      d,
      principal(req),
      req.get("idempotency-key"),
      "account-contact:" + accountId,
      x,
      async (session, a) => {
        const target = await d.accounts.findOne(
          { _id: accountId, active: true },
          { session },
        );
        assert(
          target && canIssue(a, target.role, target.areaIds),
          403,
          "ISSUER_SCOPE_DENIED",
          "Only the authorized issuer can change this contact number.",
        );
        const changed = await d.accounts.updateOne(
          { _id: accountId, authVersion: x.authVersion },
          {
            $set: {
              phoneHash: keyed(x.contactNumber, c.TOKEN_KEY),
              phoneCipher: encrypt(x.contactNumber, c.DATA_KEY),
              contactConfirmedAt: new Date(),
              contactConfirmedBy: a._id,
            },
            $inc: { authVersion: 1, fence: 1 },
          },
          { session },
        );
        assert(
          changed.modifiedCount,
          409,
          "ACCOUNT_CHANGED",
          "Reload this account.",
        );
        await d.sessions.deleteMany({ accountId }, { session });
        await d.tokens.deleteMany({ accountId }, { session });
        await audit(
          d,
          session,
          a._id,
          "Account contact changed by issuer; sessions revoked",
          accountId,
        );
        return { id: accountId };
      },
    );
    res.json(result);
  });
  return r;
}
