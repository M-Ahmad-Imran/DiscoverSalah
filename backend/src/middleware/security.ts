import type { RequestHandler, Request } from "express";
import type { Config } from "../config/env.js";
import type { Database } from "../db/database.js";
import type { Account, Session } from "../db/models.js";
import { assert } from "../lib/errors.js";
import { digest, equal, keyed } from "../lib/crypto.js";
declare global {
  namespace Express {
    interface Request {
      account?: Account;
      authSession?: Session;
      requestId: string;
    }
  }
}
export function requireAuth(
  d: Database,
  c: Config,
  allowPasswordChange = false,
): RequestHandler {
  return async (req, _res, next) => {
    const raw = req.cookies?.[cookieName(c)];
    assert(typeof raw === "string", 401, "SIGN_IN_REQUIRED", "Please sign in.");
    const s = await d.sessions.findOne({
      _id: digest(raw),
      expiresAt: { $gt: new Date() },
    });
    assert(s, 401, "SESSION_EXPIRED", "Please sign in again.");
    const a = await d.accounts.findOne({
      _id: s.accountId,
      active: true,
      authVersion: s.authVersion,
    });
    assert(a, 403, "ACCESS_REVOKED", "Account access is unavailable.");
    assert(
      a.role !== "admin" || s.mfa,
      401,
      "MFA_REQUIRED",
      "Administrator verification required.",
    );
    assert(
      allowPasswordChange || !a.mustChangePassword,
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Change your temporary password before continuing.",
    );
    req.account = a;
    req.authSession = s;
    next();
  };
}
export const cookieName = (c: Config) =>
  c.NODE_ENV === "production" ? "__Host-ds-session" : "ds-session";
export function originGuard(c: Config): RequestHandler {
  return (req, _res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    assert(
      req.get("origin") === c.WEB_ORIGIN,
      403,
      "ORIGIN_DENIED",
      "This request origin is not allowed.",
    );
    assert(
      req.is("application/json"),
      415,
      "JSON_REQUIRED",
      "Use application/json.",
    );
    next();
  };
}
export const csrf: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const value = req.get("x-csrf-token");
  assert(
    value && req.authSession && equal(digest(value), req.authSession.csrfHash),
    403,
    "CSRF_FAILED",
    "Reload your session before submitting.",
  );
  next();
};
export function rateLimit(
  d: Database,
  c: Config,
  bucket: string,
  limit: number,
  seconds: number,
  identity?: (req: Request) => string,
): RequestHandler {
  return async (req, res, next) => {
    const window = Math.floor(Date.now() / (seconds * 1000));
    const key = keyed(
      bucket +
        ":" +
        (identity ? identity(req) : req.ip || "unknown") +
        ":" +
        window,
      c.TOKEN_KEY,
    );
    const collection = d.db.collection<{
      _id: string;
      count: number;
      expiresAt: Date;
    }>("rateLimits");
    let row;
    try {
      row = await collection.findOneAndUpdate(
        { _id: key },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date((window + 2) * seconds * 1000) },
        },
        { upsert: true, returnDocument: "after" },
      );
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
      row = await collection.findOneAndUpdate(
        { _id: key },
        { $inc: { count: 1 } },
        { returnDocument: "after" },
      );
    }
    if ((row?.count || 0) > limit) {
      res.setHeader("Retry-After", String(seconds));
      assert(
        false,
        429,
        "RATE_LIMITED",
        "Too many requests. Please retry later.",
      );
    }
    next();
  };
}
export function principal(req: Request) {
  assert(req.account, 401, "SIGN_IN_REQUIRED", "Please sign in.");
  return req.account;
}
