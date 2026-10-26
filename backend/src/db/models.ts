import type { z } from "zod";
import type { snapshot, evidence } from "../lib/validation.js";
export type Role = "representative" | "focal" | "admin";
export interface Account {
  _id: string;
  name: string;
  role: Role;
  areaIds: string[];
  active: boolean;
  phoneHash: string;
  phoneCipher: string;
  contactVerifiedAt?: Date;
  contactConfirmedAt?: Date;
  contactConfirmedBy?: string;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: Date;
  passwordHash?: string;
  authVersion: number;
  fence: number;
  mfaSecret?: string;
  mfaLastStep?: number;
  recoveryCodes?: string[];
  createdAt: Date;
}
export interface Session {
  _id: string;
  accountId: string;
  authVersion: number;
  csrfHash: string;
  mfa: boolean;
  expiresAt: Date;
  createdAt: Date;
}
export interface Area {
  _id: string;
  name: string;
  city: string;
  focalId: string | null;
  revision: number;
}
export type Snapshot = z.infer<typeof snapshot>;
export type Evidence = z.infer<typeof evidence>;
export interface Venue {
  registrationState?: "Submitted" | "Approved" | "Returned" | "Rejected";
  registrationRelationship?: string;
  _id: string;
  name: string;
  urdu: string;
  areaId: string;
  city: string;
  address: string;
  entrance: { type: "Point"; coordinates: [number, number] };
  kind: "Mosque" | "Prayer ground";
  parentVenueId?: string;
  facilities: Record<string, "Available" | "Unavailable" | "Unknown">;
  status: "Draft" | "Published" | "Maintenance pending" | "Suspended";
  repId: string | null;
  focalId: string | null;
  backup?: { reviewerId: string; startsAt: Date; endsAt: Date };
  revision: number;
  writeFence?: number;
  authorId: string;
  initial: Snapshot;
  identityApprovedAt?: Date;
  reconfirmedAt?: Date;
  createdAt: Date;
}
export interface PrivateContact {
  _id: string;
  venueId: string;
  phoneCipher: string;
  nameCipher: string;
  permission: boolean;
  verifiedAt?: Date;
}
export interface Proposal {
  _id: string;
  venueId: string;
  authorId: string;
  version: number;
  baseRevision: number;
  state: "Submitted" | "Approved" | "Returned" | "Rejected" | "Superseded";
  snapshot: Snapshot;
  before: Snapshot;
  createdAt: Date;
  reviewerId?: string;
  decidedAt?: Date;
  publicReason?: string;
  evidenceCipher?: string;
}
export interface ReviewTask {
  _id: string;
  venueId: string;
  recordId: string;
  kind: string;
  state: "Open" | "Closed";
  createdAt: Date;
}
export interface Audit {
  _id: string;
  actorId: string;
  action: string;
  target: string;
  venueId?: string;
  at: Date;
}
export interface Outbox {
  _id: string;
  recipientId: string;
  title: string;
  href: string;
  state: "pending" | "processing" | "delivered" | "failed";
  attempts: number;
  availableAt: Date;
  leaseUntil?: Date;
  leaseToken?: string;
  lastError?: string;
  createdAt: Date;
}
export interface Notification {
  _id: string;
  accountId: string;
  title: string;
  href: string;
  read: boolean;
  createdAt: Date;
}
export interface Command {
  _id: string;
  actorId: string;
  hash: string;
  result: unknown;
  createdAt: Date;
}
export interface AccessToken {
  _id: string;
  accountId: string;
  purpose: "invite" | "reset" | "mfa";
  authVersion: number;
  expiresAt: Date;
  usedAt?: Date;
}
export interface PublicRequest {
  _id: string;
  kind: "report" | "suggestion" | "application" | "contact";
  title: string;
  areaId?: string;
  venueId?: string;
  status: string;
  publicResponse?: string;
  privateCipher: string;
  trackingHash: string;
  trackingExpiresAt: Date;
  createdAt: Date;
  closedAt?: Date;
  redactedAt?: Date;
}
export interface Notice {
  _id: string;
  venueId: string;
  authorId: string;
  title: string;
  body: string;
  category: "Religious event" | "Mosque service" | "Death / Janazah";
  event: string;
  expires: string;
  sourceCipher: string;
  state:
    | "Draft"
    | "Submitted"
    | "Published"
    | "Returned"
    | "Rejected"
    | "Canceled"
    | "Superseded";
  replacesId?: string;
  revision: number;
  createdAt: Date;
}
export interface Dispute {
  _id: string;
  venueId: string;
  prayer: string;
  date: string;
  reason: string;
  active: boolean;
  actorId: string;
  createdAt: Date;
}
