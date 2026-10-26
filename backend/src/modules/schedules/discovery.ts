import { Router } from "express";
import { z } from "zod";
import type { Document } from "mongodb";
import type { Database } from "../../db/database.js";
import { date, prayers } from "../../lib/validation.js";
import { assert } from "../../lib/errors.js";
import { confidence } from "./policy.js";
import type { Venue, Snapshot } from "../../db/models.js";
import { publicVenue } from "../venues/policies.js";
const query = z
  .object({
    date,
    prayer: z.enum(prayers),
    city: z.string().min(1).max(100),
    scope: z.enum(["nearby", "city"]),
    origin: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .strict()
      .optional(),
    radius: z.number().min(0.1).max(7).default(5),
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z
      .object({
        time: z.string().regex(/^\d{2}:\d{2}$/),
        venueId: z.string().uuid(),
        sessionId: z.string().min(1).max(80),
      })
      .strict()
      .optional(),
    upcomingOnly: z.boolean().default(true),
  })
  .strict();
export function discoveryRoutes(d: Database) {
  const r = Router();
  r.post("/discover/query", async (req, res) => {
    const q = query.parse(req.body);
    const match: Document = {
      status: { $in: ["Published", "Maintenance pending"] },
    };
    if (q.scope === "city") match.city = q.city;
    else {
      assert(q.origin, 422, "ORIGIN_REQUIRED", "Select a precise origin.");
      match.entrance = {
        $geoWithin: {
          $centerSphere: [[q.origin.lng, q.origin.lat], q.radius / 6371],
        },
      };
    }
    const friday = new Date(q.date + "T12:00:00+05:00").getUTCDay() === 5;
    const pipeline: Document[] = [
      { $match: match },
      {
        $lookup: {
          from: "proposals",
          let: { vid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$venueId", "$$vid"] },
                    { $eq: ["$state", "Approved"] },
                    { $lte: ["$snapshot.effective", q.date] },
                  ],
                },
              },
            },
            { $sort: { "snapshot.effective": -1, version: -1 } },
            { $limit: 1 },
          ],
          as: "approved",
        },
      },
      {
        $set: {
          schedule: {
            $ifNull: [{ $arrayElemAt: ["$approved.snapshot", 0] }, "$initial"],
          },
        },
      },
      {
        $set: {
          dated: {
            $filter: {
              input: "$schedule.special",
              as: "s",
              cond: {
                $and: [
                  { $eq: ["$$s.date", q.date] },
                  { $eq: ["$$s.prayer", q.prayer] },
                ],
              },
            },
          },
        },
      },
      {
        $set: {
          matches: {
            $cond: [
              { $gt: [{ $size: "$dated" }, 0] },
              {
                $filter: {
                  input: "$dated",
                  as: "s",
                  cond: { $eq: ["$$s.canceled", false] },
                },
              },
              (q.prayer === "Dhuhr" && friday) ||
              ["Jumu’ah", "Eid"].includes(q.prayer)
                ? []
                : [
                    {
                      id: "daily",
                      prayer: q.prayer,
                      date: q.date,
                      time: "$schedule.times." + q.prayer,
                      khutbah: "",
                      provisional: false,
                      canceled: false,
                    },
                  ],
            ],
          },
        },
      },
      { $match: { "schedule.effective": { $lte: q.date } } },
      { $unwind: "$matches" },
      { $match: { "matches.time": { $type: "string" } } },
    ];
    if (q.upcomingOnly)
      pipeline.push({
        $match: {
          $expr: {
            $gt: [
              {
                $dateFromString: {
                  dateString: {
                    $concat: [q.date, "T", "$matches.time", ":00+05:00"],
                  },
                },
              },
              new Date(),
            ],
          },
        },
      });
    if (q.cursor)
      pipeline.push({
        $match: {
          $or: [
            { "matches.time": { $gt: q.cursor.time } },
            { "matches.time": q.cursor.time, _id: { $gt: q.cursor.venueId } },
            {
              "matches.time": q.cursor.time,
              _id: q.cursor.venueId,
              "matches.id": { $gt: q.cursor.sessionId },
            },
          ],
        },
      });
    pipeline.push(
      { $sort: { "matches.time": 1, _id: 1, "matches.id": 1 } },
      { $limit: q.limit + 1 },
      { $unset: ["approved", "initial", "schedule", "dated"] },
    );
    const rows = await d.venues
      .aggregate<Venue & { matches: Snapshot["special"][number] }>(pipeline, {
        maxTimeMS: 5000,
      })
      .toArray();
    const selected = rows.slice(0, q.limit),
      ids = selected.map((v) => v._id);
    const pending = await d.proposals
      .find({ venueId: { $in: ids }, state: "Submitted" })
      .toArray();
    const disputes = await d.disputes
      .find({ venueId: { $in: ids }, active: true, date: q.date })
      .toArray();
    const last = selected.at(-1);
    res.json({
      items: selected.map((v) => ({
        venue: publicVenue(v),
        session: v.matches,
        status: confidence(
          v,
          pending.find((p) => p.venueId === v._id) ?? null,
          disputes.filter((x) => x.venueId === v._id),
          q.prayer,
          q.date,
          v.matches.provisional,
        ),
        arrival: { status: "Unavailable", reason: "ROUTING_NOT_CONFIGURED" },
      })),
      nextCursor:
        rows.length > q.limit && last
          ? {
              time: last.matches.time,
              venueId: last._id,
              sessionId: last.matches.id,
            }
          : null,
      serverTime: new Date().toISOString(),
      coverage: "Participating venues only",
      ranking: "Jama’at time; no route-duration ranking",
    });
  });
  return r;
}
