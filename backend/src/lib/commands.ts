import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import type { Database } from "../db/database.js";
import type { Account } from "../db/models.js";
import { assert } from "./errors.js";
import { digest, stable } from "./crypto.js";
export async function command<T>(
  d: Database,
  account: Account,
  key: string | undefined,
  route: string,
  body: unknown,
  fn: (s: ClientSession, a: Account) => Promise<T>,
): Promise<T> {
  assert(
    key && /^[A-Za-z0-9_-]{16,100}$/.test(key),
    400,
    "IDEMPOTENCY_KEY_REQUIRED",
    "Provide a unique Idempotency-Key for this action.",
  );
  const commandId = digest(account._id + ":" + key);
  const hash = digest(stable({ route, body }));
  return d.transaction(async (s) => {
    // A write fence serializes protected commands against account revocation, not just a stale read.
    const current = await d.accounts.findOneAndUpdate(
      { _id: account._id, active: true, authVersion: account.authVersion },
      { $inc: { fence: 1 } },
      { session: s, returnDocument: "after" },
    );
    assert(current, 403, "ACCESS_REVOKED", "Your access has changed.");
    const previous = await d.commands.findOne(
      { _id: commandId },
      { session: s },
    );
    if (previous) {
      assert(
        previous.hash === hash,
        409,
        "KEY_REUSED",
        "This key was already used for a different action.",
      );
      return previous.result as T;
    }
    const result = await fn(s, current);
    await d.commands.insertOne(
      {
        _id: commandId,
        actorId: current._id,
        hash,
        result,
        createdAt: new Date(),
      },
      { session: s },
    );
    return result;
  });
}
export async function audit(
  d: Database,
  s: ClientSession,
  actorId: string,
  action: string,
  target: string,
  venueId?: string,
) {
  await d.audit.insertOne(
    { _id: randomUUID(), actorId, action, target, venueId, at: new Date() },
    { session: s },
  );
}
export async function notify(
  d: Database,
  s: ClientSession,
  recipientId: string | null,
  title: string,
  href: string,
) {
  if (recipientId)
    await d.outbox.insertOne(
      {
        _id: randomUUID(),
        recipientId,
        title,
        href,
        state: "pending",
        attempts: 0,
        availableAt: new Date(),
        createdAt: new Date(),
      },
      { session: s },
    );
}
