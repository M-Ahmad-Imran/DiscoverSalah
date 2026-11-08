import type { Venue } from "../../db/models.js";
export const DAY = 86400000;
/** Freshness measures representative confirmation, not proof of correctness. */
export function freshness(v: Venue, now = new Date()) {
  const since = v.reconfirmedAt ?? v.identityApprovedAt ?? v.createdAt;
  const days = Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY));
  return {
    days,
    status:
      days >= 14
        ? "Follow-up needed"
        : days >= 7
          ? "Confirmation due"
          : "Current",
    reminderAt: new Date(since.getTime() + 7 * DAY).toISOString(),
    followUpAt: new Date(since.getTime() + 14 * DAY).toISOString(),
  };
}
export function freshnessFilter(days: number, now = new Date()) {
  return {
    $expr: {
      $lte: [
        {
          $ifNull: [
            "$reconfirmedAt",
            { $ifNull: ["$identityApprovedAt", "$createdAt"] },
          ],
        },
        new Date(now.getTime() - days * DAY),
      ],
    },
  };
}
