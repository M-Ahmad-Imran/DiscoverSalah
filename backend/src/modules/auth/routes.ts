import { Router, type Response } from "express";
import { randomUUID } from "node:crypto";
import * as OTPAuth from "otpauth";
import { z } from "zod";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import type { Account } from "../../db/models.js";
import type { PhoneProvider } from "../../providers/phone.js";
import { assert } from "../../lib/errors.js";
import {
  token,
  digest,
  keyed,
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
} from "../../lib/crypto.js";
import { phone, password } from "../../lib/validation.js";
import {
  cookieName,
  requireAuth,
  csrf,
  principal,
  rateLimit,
} from "../../middleware/security.js";
import { audit } from "../../lib/commands.js";
export function authRoutes(d: Database, c: Config, provider: PhoneProvider) {
  const router = Router();
  router.use((req, res, next) => {
    if (
      [
        "/auth/recovery",
        "/auth/reset",
        "/invitations/inspect",
        "/invitations/challenge",
        "/invitations/accept",
      ].includes(req.path)
    ) {
      return res
        .status(410)
        .json({
          error: {
            code: "ISSUER_RESET_REQUIRED",
            message:
              "Contact your issuing focal person or administrator for credentials. SMS verification is not used.",
          },
        });
    }
    next();
  });
  const limited = rateLimit(d, c, "auth", 20, 900);
  const contactLimited = rateLimit(d, c, "auth-contact", 10, 900, (req) => {
    const parsed = phone.safeParse(req.body?.contactNumber);
    return parsed.success ? parsed.data : "invalid";
  });
  const dummy = hashPassword(token());

  async function issue(a: Account, mfa: boolean, res: Response) {
    const raw = token(),
      csrfToken = keyed("csrf:" + raw, c.TOKEN_KEY);
    await d.transaction(async (s) => {
      const current = await d.accounts.findOneAndUpdate(
        { _id: a._id, active: true, authVersion: a.authVersion },
        { $inc: { fence: 1 } },
        { session: s },
      );
      assert(current, 401, "INVALID_CREDENTIALS", "Unable to sign in.");
      await d.sessions.insertOne(
        {
          _id: digest(raw),
          accountId: a._id,
          authVersion: a.authVersion,
          csrfHash: digest(csrfToken),
          mfa,
          expiresAt: new Date(Date.now() + c.SESSION_HOURS * 3600000),
          createdAt: new Date(),
        },
        { session: s },
      );
    });
    res.cookie(cookieName(c), raw, {
      httpOnly: true,
      secure: c.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: c.SESSION_HOURS * 3600000,
    });
    return {
      account: {
        id: a._id,
        name: a.name,
        role: a.role,
        areaIds: a.areaIds,
        mustChangePassword: !!a.mustChangePassword,
        contactConfirmedAt: a.contactConfirmedAt,
      },
      csrfToken,
    };
  }
  router.post("/auth/sign-in", limited, contactLimited, async (req, res) => {
    const x = z
      .object({ contactNumber: phone, password })
      .strict()
      .parse(req.body);
    const a = await d.accounts.findOne({
      phoneHash: keyed(x.contactNumber, c.TOKEN_KEY),
    });
    const valid = await verifyPassword(
      x.password,
      a?.passwordHash || (await dummy),
    );
    assert(
      a?.active &&
        (a.contactConfirmedAt || a.contactVerifiedAt) &&
        valid &&
        (!a.mustChangePassword ||
          (!!a.temporaryPasswordExpiresAt &&
            a.temporaryPasswordExpiresAt > new Date())),
      401,
      "INVALID_CREDENTIALS",
      "Unable to sign in with these credentials.",
    );
    if (a.role === "admin") {
      assert(
        a.mfaSecret,
        403,
        "MFA_SETUP_REQUIRED",
        "Administrator MFA must be provisioned securely.",
      );
      const raw = token();
      await d.tokens.insertOne({
        _id: digest(raw),
        accountId: a._id,
        purpose: "mfa",
        authVersion: a.authVersion,
        expiresAt: new Date(Date.now() + 300000),
      });
      return res.status(202).json({ mfaRequired: true, challenge: raw });
    }
    res.json(await issue(a, false, res));
  });
  router.post("/auth/mfa", limited, async (req, res) => {
    const x = z
      .object({
        challenge: z.string().min(32).max(100),
        code: z.string().min(6).max(100),
      })
      .strict()
      .parse(req.body);
    const hash = digest(x.challenge);
    const a = await d.transaction(async (s) => {
      const challenge = await d.tokens.findOne(
        {
          _id: hash,
          purpose: "mfa",
          usedAt: { $exists: false },
          expiresAt: { $gt: new Date() },
        },
        { session: s },
      );
      assert(
        challenge,
        401,
        "INVALID_CHALLENGE",
        "Challenge expired or invalid.",
      );
      const account = await d.accounts.findOne(
        {
          _id: challenge.accountId,
          active: true,
          authVersion: challenge.authVersion,
        },
        { session: s },
      );
      assert(
        account?.mfaSecret,
        401,
        "INVALID_CHALLENGE",
        "Challenge expired or invalid.",
      );
      const otp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(
          decrypt(account.mfaSecret, c.DATA_KEY),
        ),
        period: 30,
        digits: 6,
        algorithm: "SHA1",
      });
      const delta = otp.validate({ token: x.code, window: 1 });
      const step = Math.floor(Date.now() / 30000) + (delta ?? 0);
      const recovery = digest(x.code);
      const recoveryValid = account.recoveryCodes?.includes(recovery);
      assert(
        recoveryValid || (delta !== null && step > (account.mfaLastStep ?? -1)),
        401,
        "INVALID_CHALLENGE",
        "Invalid or reused verification code.",
      );
      await d.tokens.updateOne(
        { _id: hash },
        { $set: { usedAt: new Date() } },
        { session: s },
      );
      await d.accounts.updateOne(
        { _id: account._id },
        recoveryValid
          ? { $pull: { recoveryCodes: recovery }, $inc: { fence: 1 } }
          : { $set: { mfaLastStep: step }, $inc: { fence: 1 } },
        { session: s },
      );
      return account;
    });
    res.json(await issue(a, true, res));
  });
  router.get("/session", requireAuth(d, c, true), async (req, res) => {
    const a = principal(req);
    const fresh = keyed("csrf:" + req.cookies[cookieName(c)], c.TOKEN_KEY);
    await d.sessions.updateOne(
      { _id: req.authSession!._id },
      { $set: { csrfHash: digest(fresh) } },
    );
    res.json({
      account: {
        id: a._id,
        name: a.name,
        role: a.role,
        areaIds: a.areaIds,
        mustChangePassword: !!a.mustChangePassword,
        contactConfirmedAt: a.contactConfirmedAt,
        contactNumber: decrypt(a.phoneCipher, c.DATA_KEY),
        contactVerifiedAt: a.contactVerifiedAt,
      },
      csrfToken: fresh,
    });
  });
  router.post(
    "/auth/sign-out",
    requireAuth(d, c, true),
    csrf,
    async (req, res) => {
      await d.sessions.deleteOne({ _id: req.authSession!._id });
      res
        .clearCookie(cookieName(c), {
          path: "/",
          secure: c.NODE_ENV === "production",
          httpOnly: true,
          sameSite: "lax",
        })
        .status(204)
        .end();
    },
  );
  router.post(
    "/auth/change-password",
    limited,
    requireAuth(d, c, true),
    csrf,
    async (req, res) => {
      const x = z
        .object({ currentPassword: password, newPassword: password })
        .strict()
        .parse(req.body);
      const a = principal(req);
      assert(
        await verifyPassword(x.currentPassword, a.passwordHash || ""),
        401,
        "INVALID_CREDENTIALS",
        "Current credentials are invalid.",
      );
      assert(
        x.newPassword !== x.currentPassword,
        422,
        "PASSWORD_UNCHANGED",
        "Choose a different private password.",
      );
      const hashed = await hashPassword(x.newPassword);
      await d.transaction(async (s) => {
        const changed = await d.accounts.updateOne(
          { _id: a._id, active: true, authVersion: a.authVersion },
          {
            $set: { passwordHash: hashed, mustChangePassword: false },
            $unset: { temporaryPasswordExpiresAt: "" },
            $inc: { authVersion: 1, fence: 1 },
          },
          { session: s },
        );
        assert(
          changed.modifiedCount,
          409,
          "ACCOUNT_CHANGED",
          "Reload account access.",
        );
        await d.sessions.deleteMany({ accountId: a._id }, { session: s });
        await audit(d, s, a._id, "Password changed; sessions revoked", a._id);
      });
      res.clearCookie(cookieName(c), { path: "/" }).status(204).end();
    },
  );
  return router;
}
