import { MongoClient, type Db, type ClientSession } from "mongodb";
import type { Config } from "../config/env.js";
import type {
  Account,
  Session,
  Area,
  Venue,
  PrivateContact,
  Proposal,
  ReviewTask,
  Audit,
  Outbox,
  Notification,
  Command,
  AccessToken,
  PublicRequest,
  Notice,
  Dispute,
} from "./models.js";
export class Database {
  constructor(
    public client: MongoClient,
    public db: Db,
  ) {}
  get accounts() {
    return this.db.collection<Account>("accounts");
  }
  get sessions() {
    return this.db.collection<Session>("sessions");
  }
  get areas() {
    return this.db.collection<Area>("areas");
  }
  get venues() {
    return this.db.collection<Venue>("venues");
  }
  get contacts() {
    return this.db.collection<PrivateContact>("privateContacts");
  }
  get proposals() {
    return this.db.collection<Proposal>("proposals");
  }
  get tasks() {
    return this.db.collection<ReviewTask>("reviewTasks");
  }
  get audit() {
    return this.db.collection<Audit>("audit");
  }
  get outbox() {
    return this.db.collection<Outbox>("outbox");
  }
  get notifications() {
    return this.db.collection<Notification>("notifications");
  }
  get commands() {
    return this.db.collection<Command>("commands");
  }
  get tokens() {
    return this.db.collection<AccessToken>("accessTokens");
  }
  get requests() {
    return this.db.collection<PublicRequest>("requests");
  }
  get notices() {
    return this.db.collection<Notice>("notices");
  }
  get disputes() {
    return this.db.collection<Dispute>("disputes");
  }
  async transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const s = this.client.startSession();
    try {
      return await s.withTransaction(() => fn(s), {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
        maxCommitTimeMS: 10000,
        timeoutMS: 15000,
      });
    } finally {
      await s.endSession();
    }
  }
}
export async function connect(c: Config) {
  const client = new MongoClient(c.MONGODB_URI, {
    maxPoolSize: 20,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 20000,
  });
  await client.connect();
  const db = client.db(c.DB_NAME);
  const hello = await db.command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid") {
    await client.close();
    throw Error(
      "MongoDB replica set required; standalone databases are not supported",
    );
  }
  return new Database(client, db);
}
export async function indexes(d: Database) {
  await d.db
    .collection("phoneChallenges")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await d.accounts.createIndex({ phoneHash: 1 }, { unique: true });
  await d.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await d.sessions.createIndex({ accountId: 1 });
  await d.tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await d.venues.createIndex({ entrance: "2dsphere" });
  await d.venues.createIndex({ status: 1, city: 1, _id: 1 });
  await d.venues.createIndex({ repId: 1, _id: 1 });
  await d.venues.createIndex({ focalId: 1, _id: 1 });
  await d.proposals.createIndex({ venueId: 1, version: 1 }, { unique: true });
  await d.proposals.createIndex(
    { venueId: 1, state: 1 },
    { unique: true, partialFilterExpression: { state: "Submitted" } },
  );
  await d.proposals.createIndex({
    venueId: 1,
    state: 1,
    "snapshot.effective": -1,
    version: -1,
  });
  await d.proposals.createIndex({ state: 1, _id: 1 });
  await d.accounts.createIndex({ role: 1, _id: 1 });
  await d.accounts.createIndex({ areaIds: 1, role: 1, _id: 1 });
  await d.requests.createIndex({ venueId: 1, kind: 1, status: 1, _id: 1 });
  await d.notices.createIndex({ state: 1, _id: 1 });
  await d.db
    .collection("venueChanges")
    .createIndex({ state: 1, kind: 1, _id: 1 });
  await d.db.collection("escalations").createIndex({ proposalId: 1 });
  await d.contacts.createIndex({ venueId: 1 }, { unique: true });
  await d.tasks.createIndex({ recordId: 1 }, { unique: true });
  await d.outbox.createIndex({ state: 1, availableAt: 1, leaseUntil: 1 });
  await d.notifications.createIndex({ accountId: 1, _id: 1 });
  await d.audit.createIndex({ venueId: 1, at: -1 });
  await d.db
    .collection("registrationDecisions")
    .createIndex({ venueId: 1, at: -1 });
  await d.db
    .collection("registrationRevisions")
    .createIndex({ venueId: 1, revision: 1 }, { unique: true });
  await d.requests.createIndex({ trackingHash: 1 }, { unique: true });
  await d.requests.createIndex({ areaId: 1, kind: 1, status: 1, _id: 1 });
  await d.requests.createIndex({ kind: 1, status: 1, closedAt: 1 });
  await d.notices.createIndex({ venueId: 1, state: 1, expires: 1 });
  await d.disputes.createIndex({ venueId: 1, active: 1, date: 1 });
  await d.db
    .collection("rateLimits")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
