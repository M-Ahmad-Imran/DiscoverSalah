import type { Database } from "../db/database.js";

interface DeletionRecord {
  _id: string;
  kind: "application-private-data";
  at: Date;
}

/**
 * Keep minimal decision provenance, but remove application content after closure.
 * Export this ledger separately from database backups; replay it before restored
 * databases serve traffic so old backups cannot resurrect removed private data.
 */
export async function redactApplication(
  d: Database,
  requestId: string,
  at: Date,
) {
  await d.transaction(async (session) => {
    await d.requests.updateOne(
      { _id: requestId, kind: "application" },
      {
        $set: {
          privateCipher: "",
          title: "Application",
          redactedAt: at,
          trackingExpiresAt: at,
        },
        $unset: { publicResponse: "" },
      },
      { session },
    );
    await d.db
      .collection("investigations")
      .deleteMany({ requestId }, { session });
    await d.db
      .collection<DeletionRecord>("deletionLedger")
      .updateOne(
        { _id: requestId },
        { $setOnInsert: { kind: "application-private-data", at } },
        { upsert: true, session },
      );
  });
}

export async function retainOneBatch(d: Database, now = new Date()) {
  await d.commands.updateMany(
    {
      "result.expiresAt": { $lte: now },
      "result.secretCipher": { $exists: true },
    },
    { $unset: { "result.secretCipher": "" } },
  );
  const cutoff = new Date(now.getTime() - 90 * 86400000);
  const records = await d.requests
    .find(
      {
        kind: "application",
        status: { $in: ["Rejected", "Withdrawn"] },
        closedAt: { $lte: cutoff },
        redactedAt: { $exists: false },
      },
      { projection: { _id: 1 } },
    )
    .limit(100)
    .toArray();
  for (const record of records) await redactApplication(d, record._id, now);
  return records.length;
}

export async function replayDeletionLedger(d: Database) {
  let count = 0;
  for await (const record of d.db
    .collection<DeletionRecord>("deletionLedger")
    .find({})) {
    await redactApplication(d, record._id, record.at);
    count++;
  }
  return count;
}
