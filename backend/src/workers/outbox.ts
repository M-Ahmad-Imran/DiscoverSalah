import { randomUUID } from "node:crypto";
import type { Database } from "../db/database.js";
/** Durable in-account notifications. Lease + deterministic notification ID make retries safe. */
export async function deliverOne(d: Database, now = new Date()) {
  const leaseToken = randomUUID();
  const job = await d.outbox.findOneAndUpdate(
    {
      $or: [
        { state: "pending", availableAt: { $lte: now } },
        { state: "processing", leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        state: "processing",
        leaseUntil: new Date(now.getTime() + 30000),
        leaseToken,
      },
      $inc: { attempts: 1 },
    },
    { sort: { availableAt: 1 }, returnDocument: "after" },
  );
  if (!job) return false;
  try {
    await d.transaction(async (s) => {
      const owned = await d.outbox.findOne(
        { _id: job._id, leaseToken, state: "processing" },
        { session: s },
      );
      if (!owned) return;
      await d.notifications.updateOne(
        { _id: job._id },
        {
          $setOnInsert: {
            accountId: job.recipientId,
            title: job.title,
            href: job.href,
            read: false,
            createdAt: now,
          },
        },
        { upsert: true, session: s },
      );
      await d.outbox.updateOne(
        { _id: job._id, leaseToken },
        {
          $set: { state: "delivered" },
          $unset: { leaseUntil: "", leaseToken: "", lastError: "" },
        },
        { session: s },
      );
    });
  } catch {
    await d.outbox.updateOne(
      { _id: job._id, leaseToken },
      {
        $set: {
          state: job.attempts >= 5 ? "failed" : "pending",
          lastError: "DELIVERY_WRITE_FAILED",
          availableAt: new Date(
            now.getTime() + Math.min(3600000, 1000 * 2 ** job.attempts),
          ),
        },
        $unset: { leaseUntil: "", leaseToken: "" },
      },
    );
  }
  return true;
}
