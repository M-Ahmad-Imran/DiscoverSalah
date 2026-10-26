import { randomUUID } from "node:crypto";
import * as OTPAuth from "otpauth";
import { config } from "../src/config/env.js";
import { connect, indexes } from "../src/db/database.js";
import { encrypt, keyed, hashPassword, digest } from "../src/lib/crypto.js";
import { phone, password, text } from "../src/lib/validation.js";
// Operator-only provisioning. Do not expose this operation as an unauthenticated HTTP endpoint.
const c = config();
const number = phone.parse(process.env.BOOTSTRAP_PHONE),
  pass = password.parse(process.env.BOOTSTRAP_PASSWORD),
  name = text.parse(process.env.BOOTSTRAP_NAME);
const secret = process.env.BOOTSTRAP_TOTP_SECRET;
const codes = (process.env.BOOTSTRAP_RECOVERY_CODES || "").split(",");
if (
  !secret ||
  codes.length < 8 ||
  codes.some((v) => v.length < 24) ||
  process.env.BOOTSTRAP_IDENTITY_CONFIRMED !== "yes"
)
  throw Error(
    "Provision an independent TOTP secret, eight high-entropy recovery codes, and confirm contact ownership offline first.",
  );
OTPAuth.Secret.fromBase32(secret);
const d = await connect(c);
try {
  await indexes(d);
  await d.transaction(async (s) => {
    await d.db
      .collection<{ _id: string; at: Date }>("bootstrapLock")
      .insertOne({ _id: "initial-admin", at: new Date() }, { session: s });
    if (await d.accounts.countDocuments({ role: "admin" }, { session: s }))
      throw Error("An administrator already exists.");
    const id = randomUUID();
    await d.accounts.insertOne(
      {
        _id: id,
        name,
        role: "admin",
        areaIds: [],
        active: true,
        phoneHash: keyed(number, c.TOKEN_KEY),
        phoneCipher: encrypt(number, c.DATA_KEY),
        contactConfirmedAt: new Date(),
        contactConfirmedBy: "initial-operator",
        mustChangePassword: process.env.BOOTSTRAP_TEMPORARY === "yes",
        ...(process.env.BOOTSTRAP_TEMPORARY === "yes"
          ? { temporaryPasswordExpiresAt: new Date(Date.now() + 86400000) }
          : {}),
        passwordHash: await hashPassword(pass),
        authVersion: 0,
        fence: 0,
        mfaSecret: encrypt(secret, c.DATA_KEY),
        recoveryCodes: codes.map(digest),
        createdAt: new Date(),
      },
      { session: s },
    );
    await d.audit.insertOne(
      {
        _id: randomUUID(),
        actorId: id,
        action:
          "Initial administrator provisioned by operator; offline contact ownership confirmed",
        target: id,
        at: new Date(),
      },
      { session: s },
    );
  });
  console.info(
    "Administrator provisioned. Store recovery materials offline and clear bootstrap environment variables.",
  );
} finally {
  await d.client.close();
}
