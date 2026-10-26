import type { Venue, Proposal, Snapshot, Dispute } from "../../db/models.js";
export function effective(
  v: Venue,
  approved: Proposal[],
  date: string,
): Snapshot {
  return (
    approved
      .filter((p) => p.state === "Approved" && p.snapshot.effective <= date)
      .sort(
        (a, b) =>
          b.snapshot.effective.localeCompare(a.snapshot.effective) ||
          b.version - a.version,
      )[0]?.snapshot ?? v.initial
  );
}
export function sessions(snapshot: Snapshot, prayer: string, date: string) {
  if (snapshot.effective > date) return [];
  const dated = snapshot.special.filter(
    (s) => s.prayer === prayer && s.date === date,
  );
  if (dated.length) return dated.filter((s) => !s.canceled);
  if (
    prayer === "Dhuhr" &&
    new Date(date + "T12:00:00+05:00").getUTCDay() === 5
  )
    return [];
  const time = snapshot.times[prayer as keyof Snapshot["times"]];
  return time
    ? [
        {
          id: "daily",
          prayer,
          date,
          time,
          khutbah: "",
          provisional: false,
          canceled: false,
        },
      ]
    : [];
}
export function affected(p: Proposal, prayer: string, date: string) {
  return (
    p.state === "Submitted" &&
    p.snapshot.effective <= date &&
    JSON.stringify(sessions(p.before, prayer, date)) !==
      JSON.stringify(sessions(p.snapshot, prayer, date))
  );
}
export function confidence(
  v: Venue,
  pending: Proposal | null,
  disputes: Dispute[],
  prayer: string,
  date: string,
  provisional: boolean,
) {
  if (v.status !== "Published" || !v.repId || !v.focalId)
    return "Maintenance pending";
  if (provisional) return "Provisional";
  if (disputes.some((d) => d.active && d.prayer === prayer && d.date === date))
    return "Disputed";
  if (pending && affected(pending, prayer, date)) return "Under review";
  return "Approved timetable";
}
