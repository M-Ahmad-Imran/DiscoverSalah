import { randomUUID } from "node:crypto";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import type { Account } from "../../db/models.js";
import { assert } from "../../lib/errors.js";
import { command, audit, notify } from "../../lib/commands.js";
import { submitSchema, decisionSchema, today } from "../../lib/validation.js";
import { encrypt } from "../../lib/crypto.js";
import { manages, reviews } from "../venues/policies.js";
import { effective } from "./policy.js";
export async function submit(
  d: Database,
  a: Account,
  venueId: string,
  key: string | undefined,
  input: unknown,
  c?: Config,
) {
  const x = submitSchema.parse(input);
  assert(
    x.effective >= today(),
    422,
    "PAST_EFFECTIVE_DATE",
    "Use today or a future effective date.",
  );
  return command(d, a, key, "submit:" + venueId, x, async (s, actor) => {
    const v = await d.venues.findOne({ _id: venueId }, { session: s });
    assert(v && manages(actor, v), 403, "SCOPE_DENIED", "Venue access denied.");
    assert(
      v.status === "Published" && v.identityApprovedAt && v.repId && v.focalId,
      409,
      "VENUE_NOT_PUBLISHED",
      "Verify the mosque and assign its staff before publishing times.",
    );
    if (actor.role !== "representative")
      assert(
        x.contactMethod && x.contactSource && c,
        422,
        "CONTACT_EVIDENCE_REQUIRED",
        "Record the phone call or visit and who confirmed the correction.",
      );
    assert(
      v.revision === x.baseRevision,
      409,
      "VERSION_CONFLICT",
      "Reload the current timetable before submitting.",
    );
    const approved = await d.proposals
      .find(
        { venueId, state: { $in: ["Approved", "Published"] } },
        { session: s },
      )
      .toArray();
    const before = effective(v, approved, x.effective);
    const { baseRevision, contactMethod, contactSource, ...snapshot } = x;
    const now = new Date();
    const pid = randomUUID();
    await d.proposals.updateMany(
      { venueId, state: "Submitted" },
      { $set: { state: "Superseded" } },
      { session: s },
    );
    await d.tasks.updateMany(
      { venueId, kind: "Timetable", state: "Open" },
      { $set: { state: "Closed" } },
      { session: s },
    );
    const changed = await d.venues.updateOne(
      { _id: venueId, revision: baseRevision },
      {
        $inc: { revision: 1 },
        $set: {
          timetablePublishedAt: now,
          ...(actor.role === "representative" && x.effective === today()
            ? { reconfirmedAt: now }
            : {}),
        },
      },
      { session: s },
    );
    assert(
      changed.modifiedCount,
      409,
      "VERSION_CONFLICT",
      "Timetable changed.",
    );
    await d.proposals.insertOne(
      {
        _id: pid,
        venueId,
        authorId: actor._id,
        version: baseRevision + 1,
        baseRevision: baseRevision + 1,
        state: "Published",
        snapshot,
        before,
        createdAt: new Date(),
        ...(actor.role !== "representative" && c
          ? {
              evidenceCipher: encrypt(
                JSON.stringify({
                  method: contactMethod,
                  source: contactSource,
                }),
                c.DATA_KEY,
              ),
            }
          : {}),
      },
      { session: s },
    );
    await audit(d, s, actor._id, "Timetable published", pid, venueId);
    // In-app delivery is part of the same transaction; no worker delays oversight.
    await d.notifications.insertOne(
      {
        _id: randomUUID(),
        accountId: actor.role === "representative" ? v.focalId! : v.repId!,
        title: "Timetable published",
        href: "/manage/submissions/" + pid,
        read: false,
        createdAt: now,
      },
      { session: s },
    );
    return {
      id: pid,
      version: baseRevision + 1,
      venueRevision: baseRevision + 1,
      state: "Published",
    };
  });
}
export async function decide(
  d: Database,
  c: Config,
  a: Account,
  id: string,
  key: string | undefined,
  input: unknown,
) {
  const x = decisionSchema.parse(input);
  return command(d, a, key, "decision:" + id, x, async (s, actor) => {
    const p = await d.proposals.findOne({ _id: id }, { session: s });
    assert(p, 404, "NOT_FOUND", "Review not found.");
    const v = await d.venues.findOne({ _id: p.venueId }, { session: s });
    assert(
      v && reviews(actor, v),
      403,
      "SCOPE_DENIED",
      "Review authority unavailable.",
    );
    assert(
      p.authorId !== actor._id,
      403,
      "SELF_REVIEW",
      "An independent reviewer is required.",
    );
    assert(
      p.state === "Submitted" &&
        p.version === x.expectedVersion &&
        v.revision === x.expectedVenueRevision,
      409,
      "VERSION_CONFLICT",
      "This version changed or was already decided. Reload the review.",
    );
    if (x.decision === "Approved") {
      assert(
        x.evidence?.outcome === "Confirmed as submitted",
        422,
        "EVIDENCE_REQUIRED",
        "Registered Imam confirmation is required.",
      );
      assert(
        await d.contacts.findOne(
          { venueId: v._id, permission: true, verifiedAt: { $exists: true } },
          { session: s },
        ),
        422,
        "CONTACT_UNVERIFIED",
        "A verified registered contact is required.",
      );
    }
    await d.venues.updateOne(
      { _id: v._id, revision: v.revision },
      { $inc: { revision: 1 } },
      { session: s },
    );
    await d.proposals.updateOne(
      { _id: id, state: "Submitted" },
      {
        $set: {
          state: x.decision,
          reviewerId: actor._id,
          decidedAt: new Date(),
          publicReason: x.publicReason,
          ...(x.evidence
            ? {
                evidenceCipher: encrypt(JSON.stringify(x.evidence), c.DATA_KEY),
              }
            : {}),
        },
      },
      { session: s },
    );
    await d.tasks.updateOne(
      { recordId: id },
      { $set: { state: "Closed" } },
      { session: s },
    );
    await audit(d, s, actor._id, "Timetable " + x.decision, id, v._id);
    await notify(
      d,
      s,
      v.repId,
      "Timetable " + x.decision.toLowerCase(),
      "/manage/submissions/" + id,
    );
    return {
      id,
      state: x.decision,
      venueRevision: v.revision + 1,
      effective: p.snapshot.effective,
    };
  });
}
