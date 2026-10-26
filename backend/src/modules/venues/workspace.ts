import { loadScreen, screenQuery } from "./screenData.js";
import { Router } from "express";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import type { Account } from "../../db/models.js";
import { decrypt } from "../../lib/crypto.js";
import { principal } from "../../middleware/security.js";
import { venueScope } from "./routes.js";
import type { Change } from "./changes.js";
import { today } from "../../lib/validation.js";

// Compatibility read model for existing screens. It contains DTOs, never raw
// account documents or public access to private contacts/evidence.
export async function workspace(
  d: Database,
  c: Config,
  actor?: Account,
  query = screenQuery.parse({}),
) {
  const {
    visible,
    areas,
    proposals,
    contacts,
    notices,
    accounts,
    requests,
    notifications,
    audit,
    disputes,
    delivery,
    changes,
    registrationDecisions,
    pending,
    page,
    counts,
    areaCounts,
    discoverySessions,
    escalatedIds,
  } = await loadScreen(d, actor, query);
  const registrationRequests = actor
    ? visible
        .filter((v) => v.status === "Draft")
        .map((v) => ({
          id: v._id,
          kind: "registration",
          title: v.name,
          status:
            v.registrationState ||
            registrationDecisions.find((x) => x.venueId === v._id)?.decision ||
            "Submitted",
          internalNotes:
            registrationDecisions.find((x) => x.venueId === v._id)?.reason ||
            "",
          token: "",
          created: v.createdAt,
          values: {
            venue: v._id,
            author: v.authorId,
            name: v.name,
            address: v.address,
            area: areas.find((a) => a._id === v.areaId)?.name || "",
          },
        }))
    : [];
  const changeRequests = changes.map((x) => ({
    id: x._id,
    kind: x.kind,
    title: visible.find((v) => v._id === x.venueId)?.name || "Venue change",
    status: x.state,
    revision: x.revision,
    token: "",
    created: x.createdAt,
    values: {
      ...JSON.parse(decrypt(x.contentCipher, c.DATA_KEY)),
      venue: x.venueId,
      author: x.authorId,
    },
  }));
  return {
    page,
    counts,
    discoverySessions,
    areas: areas.map((a) => ({
      id: a._id,
      venueCount: areaCounts[a._id],
      name: a.name,
      city: a.city,
      focal: actor ? a.focalId || "" : a.focalId ? "assigned" : "",
      revision: a.revision,
    })),
    venues: visible.map((v) => {
      const contact = contacts.find((x) => x.venueId === v._id);
      return {
        id: v._id,
        name: v.name,
        urdu: v.urdu,
        area: areas.find((a) => a._id === v.areaId)?.name || v.areaId,
        areaId: v.areaId,
        city: v.city,
        address: v.address,
        lat: v.entrance.coordinates[1],
        lng: v.entrance.coordinates[0],
        distance: 0,
        status: v.status,
        initialEffective: v.initial.effective,
        pendingScopes: pending
          .filter((p) => p.venueId === v._id)
          .map((p) => ({
            effective: p.snapshot.effective,
            prayers: Object.keys(p.snapshot.times).filter(
              (key) =>
                p.snapshot.times[key as keyof typeof p.snapshot.times] !==
                p.before.times[key as keyof typeof p.before.times],
            ),
            dated: [...p.snapshot.special, ...p.before.special]
              .filter(
                (item) =>
                  JSON.stringify(
                    p.snapshot.special.filter(
                      (s) => s.prayer === item.prayer && s.date === item.date,
                    ),
                  ) !==
                  JSON.stringify(
                    p.before.special.filter(
                      (s) => s.prayer === item.prayer && s.date === item.date,
                    ),
                  ),
              )
              .map((item) => ({ prayer: item.prayer, date: item.date })),
          })),
        kind: v.kind,
        parentVenueId: v.parentVenueId,
        times:
          proposals
            .filter(
              (p) =>
                p.venueId === v._id &&
                p.state === "Approved" &&
                p.snapshot.effective <= query.date,
            )
            .sort(
              (a, b) =>
                b.snapshot.effective.localeCompare(a.snapshot.effective) ||
                b.version - a.version,
            )[0]?.snapshot.times || v.initial.times,
        special: v.initial.special,
        rep: actor ? v.repId || "" : "",
        focal: actor ? v.focalId || "" : "",
        revision: v.revision,
        reconfirmed: v.reconfirmedAt?.toISOString() || "",
        phoneVerified:
          contact?.verifiedAt?.toISOString() ||
          v.identityApprovedAt?.toISOString() ||
          "",
        facilities: v.facilities,
        image: 0,
        ...(actor
          ? {
              contactName: contact
                ? decrypt(contact.nameCipher, c.DATA_KEY)
                : "",
              registrationRelationship: v.registrationRelationship,
              contactNumber: contact
                ? decrypt(contact.phoneCipher, c.DATA_KEY)
                : "",
              backup: v.backup
                ? {
                    reviewer: v.backup.reviewerId,
                    startsAt: v.backup.startsAt,
                    endsAt: v.backup.endsAt,
                  }
                : undefined,
            }
          : {}),
        disputes: disputes
          .filter((x) => x.venueId === v._id)
          .map((x) => ({
            id: x._id,
            prayer: x.prayer,
            date: x.date,
            reason: actor ? x.reason : "Under investigation",
            reportId: "",
            recordedBy: actor ? x.actorId : "",
            resolved: false,
          })),
      };
    }),
    proposals: proposals.map((p) => ({
      id: p._id,
      venueId: p.venueId,
      version: p.version,
      escalated: actor ? escalatedIds.includes(p._id) : false,
      baseRevision: p.baseRevision,
      author: actor ? p.authorId : "",
      state: p.state,
      times: p.snapshot.times,
      special: p.snapshot.special,
      effective: p.snapshot.effective,
      reason: actor ? p.snapshot.reason : "",
      before: actor ? p.before.times : {},
      beforeSpecial: actor ? p.before.special : [],
      created: p.createdAt,
      reviewer: actor ? p.reviewerId : undefined,
      decision: actor ? p.publicReason : undefined,
      evidence:
        actor && actor.role !== "representative" && p.evidenceCipher
          ? JSON.parse(decrypt(p.evidenceCipher, c.DATA_KEY))
          : undefined,
    })),
    accounts: accounts.map((a) => ({
      id: a._id,
      name: a.name,
      role: a.role,
      area: areas.find((x) => a.areaIds.includes(x._id))?.name || "",
      areaIds: a.areaIds,
      authVersion: a.authVersion,
      active: a.active,
      status: a.active
        ? a.mustChangePassword
          ? "Password change required"
          : "Active"
        : "Deactivated",
      contactNumber: actor ? decrypt(a.phoneCipher, c.DATA_KEY) : undefined,
      contactConfirmedAt: a.contactConfirmedAt,
      contactVerifiedAt: a.contactVerifiedAt,
    })),
    requests: [
      ...registrationRequests,
      ...changeRequests,
      ...requests.map((r) => ({
        id: r._id,
        token: "",
        kind: r.kind,
        title: r.title,
        status: r.status,
        created: r.createdAt,
        response: r.publicResponse,
        values: r.redactedAt
          ? {}
          : {
              ...JSON.parse(decrypt(r.privateCipher, c.DATA_KEY)),
              ...JSON.parse(decrypt(r.privateCipher, c.DATA_KEY)).submitted,
              venue: r.venueId,
              area: areas.find((a) => a._id === r.areaId)?.name,
            },
        internalNotes: "",
      })),
    ],
    notices: notices.map((n) => ({
      id: n._id,
      venueId: n.venueId,
      title: n.title,
      body: n.body,
      category: n.category,
      event: n.event,
      expires: n.expires,
      state: n.state,
      revision: n.revision,
      replacesId: n.replacesId,
      author: actor ? n.authorId : "",
      source: actor ? decrypt(n.sourceCipher, c.DATA_KEY) : "",
    })),
    notifications: notifications.map((n) => ({
      id: n._id,
      title: n.title,
      href: n.href,
      role: actor!.role,
      read: n.read,
    })),
    audit: audit.map((a) => ({
      id: a._id,
      action: a.action,
      actor: a.actorId,
      at: a.at,
      target: a.target,
    })),
    deliveryJobs: delivery.map((x) => ({
      id: x._id,
      target: x.recipientId,
      state: "Failed",
      error: x.lastError || "Delivery failed",
      attempts: x.attempts,
      history: [],
    })),
    serverDate: today(),
  };
}
export function workspaceRoutes(d: Database, c: Config, protectedView = false) {
  const r = Router();
  r.get(protectedView ? "/workspace" : "/catalog", async (req, res) =>
    res.json(
      await workspace(
        d,
        c,
        protectedView ? principal(req) : undefined,
        screenQuery.parse(req.query),
      ),
    ),
  );
  return r;
}
