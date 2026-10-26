import type { Account, Venue } from "../../db/models.js";
export function manages(a: Account, v: Venue) {
  return (
    a.active &&
    (a.role === "admin" ||
      (a.role === "representative" ? v.repId === a._id : v.focalId === a._id))
  );
}
export function reviews(a: Account, v: Venue, now = new Date()) {
  return (
    a.active &&
    a.role !== "representative" &&
    (manages(a, v) ||
      (v.backup?.reviewerId === a._id &&
        v.backup.startsAt <= now &&
        now < v.backup.endsAt))
  );
}
export function publicVenue(v: Venue) {
  return {
    id: v._id,
    name: v.name,
    urdu: v.urdu,
    areaId: v.areaId,
    city: v.city,
    address: v.address,
    entrance: v.entrance,
    kind: v.kind,
    parentVenueId: v.parentVenueId,
    facilities: v.facilities,
    status: v.status,
    revision: v.revision,
    reconfirmedAt: v.reconfirmedAt,
  };
}
