import { z } from "zod";
import type { Document, Filter } from "mongodb";
import type { Database } from "../../db/database.js";
import type {
  Account,
  Venue,
  Proposal,
  Area,
  Notice,
  PublicRequest,
  Notification,
  Audit,
  Outbox,
  PrivateContact,
  Dispute,
} from "../../db/models.js";
import type { Change } from "./changes.js";
import { venueScope } from "./routes.js";
import { date, id, today, prayers } from "../../lib/validation.js";
import { assert } from "../../lib/errors.js";

export const screenQuery = z
  .object({
    view: z
      .enum([
        "none",
        "venues",
        "venue",
        "dashboard",
        "proposals",
        "proposal",
        "requests",
        "request",
        "registrations",
        "changes",
        "notices",
        "notice",
        "accounts",
        "account",
        "areas",
        "audit",
        "notifications",
        "delivery",
        "reviews",
        "discovery",
        "form",
      ])
      .default("dashboard"),
    cursor: z.string().max(1000).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    id: id.optional(),
    venue: id.optional(),
    kind: z.string().max(40).optional(),
    q: z.string().trim().max(100).default(""),
    status: z.string().max(50).optional(),
    role: z.enum(["admin", "focal", "representative"]).optional(),
    area: z.string().max(120).optional(),
    city: z.string().max(100).optional(),
    date: date.default(today),
    prayer: z.enum(prayers).default("Asr"),
    sort: z.enum(["time", "name"]).default("time"),
    scope: z.enum(["city", "nearby"]).default("city"),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(0.1).max(7).default(5),
    from: date.optional(),
    to: date.optional(),
    person: id.optional(),
    due: z.enum(["all", "past", "future"]).default("all"),
    urgent: z.enum(["true", "false"]).default("false"),
  })
  .strict();
export type ScreenQuery = z.infer<typeof screenQuery>;
type Row = Document & { _id: string };
const unique = <T extends { _id: string }>(rows: T[]) => [
  ...new Map(rows.map((x) => [x._id, x])).values(),
];
const literal = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bounded primary pages plus their explicit dependencies; never a global workspace dump. */
export async function loadScreen(
  d: Database,
  actor: Account | undefined,
  q: ScreenQuery,
) {
  const scope: Filter<Venue> = actor
    ? venueScope(actor, true)
    : { status: { $in: ["Published", "Maintenance pending"] } };
  const accountScope: Document = !actor
    ? { _id: null }
    : actor.role === "admin"
      ? {}
      : actor.role === "representative"
        ? { _id: actor._id }
        : {
            $or: [
              { _id: actor._id },
              { role: "representative", areaIds: { $in: actor.areaIds } },
            ],
          };
  const areaScope: Document =
    actor && actor.role !== "admin" ? { _id: { $in: actor.areaIds } } : {};
  const protectedViews = [
    "proposals",
    "proposal",
    "requests",
    "request",
    "registrations",
    "changes",
    "accounts",
    "account",
    "audit",
    "notifications",
    "delivery",
    "reviews",
  ];
  assert(
    actor || !protectedViews.includes(q.view),
    403,
    "SCOPE_DENIED",
    "Sign in to view these records.",
  );
  if (q.view === "delivery")
    assert(
      actor?.role === "admin",
      403,
      "SCOPE_DENIED",
      "Administrator access required.",
    );
  if (q.kind === "application")
    assert(
      actor?.role === "admin",
      403,
      "SCOPE_DENIED",
      "Administrator access required.",
    );
  const filter = (fields: string[]): Document =>
    q.q
      ? {
          $or: fields.map((key) => ({
            [key]: { $regex: literal(q.q), $options: "i" },
          })),
        }
      : {};
  const scopedJoin: Document[] = [
    {
      $lookup: {
        from: "venues",
        localField: "venueId",
        foreignField: "_id",
        pipeline: [{ $match: scope }],
        as: "_venue",
      },
    },
    { $match: { "_venue.0": { $exists: true } } },
  ];
  const requestAccess: Document[] =
    actor?.role === "admin"
      ? []
      : [
          { $match: { kind: { $ne: "application" } } },
          {
            $lookup: {
              from: "venues",
              localField: "venueId",
              foreignField: "_id",
              pipeline: [{ $match: scope }],
              as: "_venue",
            },
          },
          {
            $match: {
              $or: [
                { "_venue.0": { $exists: true } },
                ...(actor?.role === "focal"
                  ? [
                      {
                        venueId: { $exists: false },
                        areaId: { $in: actor.areaIds },
                      },
                    ]
                  : []),
              ],
            },
          },
        ];
  const read = async (
    collection: string,
    stages: Document[],
    limit = q.limit + 1,
  ) =>
    d.db
      .collection<Row>(collection)
      .aggregate<Row>([...stages, { $limit: limit }, { $unset: "_venue" }], {
        maxTimeMS: 5000,
      })
      .toArray();
  const result = {
    visible: [] as Venue[],
    areas: [] as Area[],
    proposals: [] as Proposal[],
    contacts: [] as PrivateContact[],
    notices: [] as Notice[],
    accounts: [] as Account[],
    requests: [] as PublicRequest[],
    notifications: [] as Notification[],
    audit: [] as Audit[],
    disputes: [] as Dispute[],
    delivery: [] as Outbox[],
    changes: [] as Change[],
    registrationDecisions: [] as Document[],
    pending: [] as Proposal[],
    page: {
      nextCursor: null as string | null,
      size: q.limit,
      ids: [] as string[],
      view: q.view,
      hasPrevious: !!q.cursor,
    },
    counts: {} as Record<string, number>,
    areaCounts: {} as Record<string, number>,
    discoverySessions: [] as Document[],
    escalatedIds: [] as string[],
  };
  let primary: Row[] = [];
  const cursor =
    q.cursor && q.view !== "discovery" ? id.parse(q.cursor) : undefined;
  const pageStages = (match: Document, extra: Document[] = []) => [
    {
      $match: { $and: [match, ...(cursor ? [{ _id: { $gt: cursor } }] : [])] },
    },
    ...extra,
    { $sort: { _id: 1 } },
  ];
  const state = q.status && q.status !== "All" ? q.status : undefined;
  const venueFilter: Document = {
    $and: [
      scope,
      filter(["name", "urdu", "_id"]),
      ...(q.area
        ? [
            {
              areaId: {
                $in: (
                  await d.areas
                    .find({ name: q.area }, { projection: { _id: 1 } })
                    .limit(100)
                    .toArray()
                ).map((a) => a._id),
              },
            },
          ]
        : []),
      ...(q.city ? [{ city: q.city }] : []),
      ...(q.person
        ? [
            {
              $or: [
                { repId: q.person },
                { focalId: q.person },
                { "backup.reviewerId": q.person },
              ],
            },
          ]
        : []),
      ...(q.kind && ["Mosque", "Prayer ground"].includes(q.kind)
        ? [{ kind: q.kind }]
        : []),
      ...(state ? [{ status: state }] : []),
    ],
  };
  if (
    ["venues", "dashboard", "form", "venue", "registrations"].includes(q.view)
  ) {
    const detail = q.view === "venue";
    const registrationStages: Document[] =
      q.view === "registrations"
        ? [
            { $match: { status: "Draft" } },
            {
              $lookup: {
                from: "registrationDecisions",
                localField: "_id",
                foreignField: "venueId",
                pipeline: [{ $sort: { at: -1 } }, { $limit: 1 }],
                as: "_decision",
              },
            },
            {
              $set: {
                _registrationState: {
                  $ifNull: [
                    "$registrationState",
                    {
                      $ifNull: [
                        { $arrayElemAt: ["$_decision.decision", 0] },
                        "Submitted",
                      ],
                    },
                  ],
                },
              },
            },
            ...(state ? [{ $match: { _registrationState: state } }] : []),
            { $unset: ["_decision", "_registrationState"] },
          ]
        : [];
    primary = await read(
      "venues",
      detail
        ? [{ $match: { $and: [scope, { _id: q.id }] } }]
        : pageStages(
            q.view === "registrations"
              ? { $and: [scope, filter(["name", "urdu", "_id"])] }
              : venueFilter,
            registrationStages,
          ),
    );
    result.visible = primary.slice(0, q.limit) as unknown as Venue[];
  } else if (["proposals", "proposal"].includes(q.view)) {
    primary = await read(
      "proposals",
      pageStages(
        {
          ...(q.view === "proposal" ? { _id: q.id } : {}),
          ...(state ? { state } : {}),
          ...(q.venue ? { venueId: q.venue } : {}),
        },
        [
          ...scopedJoin,
          { $match: filter(["_id", "_venue.name", "_venue.urdu"]) },
        ],
      ),
    );
    result.proposals = primary.slice(0, q.limit) as unknown as Proposal[];
  } else if (["requests", "request", "changes"].includes(q.view)) {
    const change = q.view === "changes";
    primary = await read(
      change ? "venueChanges" : "requests",
      pageStages(
        {
          ...(q.id ? { _id: q.id } : {}),
          ...(q.kind ? { kind: q.kind } : {}),
          ...(state ? { [change ? "state" : "status"]: state } : {}),
        },
        [
          ...(change ? scopedJoin : requestAccess),
          { $match: filter(["_id", "title", "_venue.name"]) },
        ],
      ),
    );
    if (change)
      result.changes = primary.slice(0, q.limit) as unknown as Change[];
    else
      result.requests = primary.slice(0, q.limit) as unknown as PublicRequest[];
    if (q.view === "request" && !primary.length && q.id) {
      result.changes = (await read("venueChanges", [
        { $match: { _id: q.id } },
        ...scopedJoin,
      ])) as unknown as Change[];
      result.visible = await d.venues
        .find({ $and: [scope, { _id: q.id, status: "Draft" }] })
        .toArray();
    }
  } else if (["notices", "notice"].includes(q.view)) {
    primary = await read(
      "notices",
      pageStages(
        {
          ...(q.id ? { _id: q.id } : {}),
          ...(q.venue ? { venueId: q.venue } : {}),
          ...(!actor
            ? { state: "Published", expires: { $gt: new Date().toISOString() } }
            : state === "Expired"
              ? {
                  state: "Published",
                  expires: { $lte: new Date().toISOString() },
                }
              : state === "Published"
                ? { state, expires: { $gt: new Date().toISOString() } }
                : state
                  ? { state }
                  : {}),
        },
        [...scopedJoin, { $match: filter(["title", "_id", "_venue.name"]) }],
      ),
    );
    result.notices = primary.slice(0, q.limit) as unknown as Notice[];
  } else if (["accounts", "account"].includes(q.view)) {
    primary = await read(
      "accounts",
      pageStages({
        $and: [
          accountScope,
          filter(["name", "_id"]),
          ...(q.view === "account" ? [{ _id: q.id || actor?._id }] : []),
          ...(q.role ? [{ role: q.role }] : q.view === "accounts" && actor?.role === "focal" ? [{role:"representative"}] : []),
        ],
      }),
    );
    result.accounts = primary.slice(0, q.limit) as unknown as Account[];
  } else if (q.view === "areas") {
    primary = await read(
      "areas",
      pageStages({ $and: [areaScope, filter(["name", "city", "_id"])] }),
    );
    result.areas = primary.slice(0, q.limit) as unknown as Area[];
  } else if (q.view === "audit") {
    primary = await read(
      "audit",
      pageStages(
        {
          ...filter(["action", "actorId", "target"]),
          ...(q.venue ? { venueId: q.venue } : {}),
          ...(q.person ? { actorId: q.person } : {}),
          ...(q.from || q.to
            ? {
                at: {
                  ...(q.from
                    ? { $gte: new Date(q.from + "T00:00:00+05:00") }
                    : {}),
                  ...(q.to
                    ? { $lte: new Date(q.to + "T23:59:59.999+05:00") }
                    : {}),
                },
              }
            : {}),
        },
        actor?.role === "admin" ? [] : scopedJoin,
      ),
    );
    result.audit = primary.slice(0, q.limit) as unknown as Audit[];
  } else if (q.view === "notifications") {
    primary = await read(
      "notifications",
      pageStages({ accountId: actor!._id, ...filter(["title"]) }),
    );
    result.notifications = primary.slice(
      0,
      q.limit,
    ) as unknown as Notification[];
  } else if (q.view === "delivery") {
    primary = await read(
      "outbox",
      pageStages({ state: "failed", ...filter(["recipientId", "lastError"]) }),
    );
    result.delivery = primary.slice(0, q.limit) as unknown as Outbox[];
  }
  // A combined queue merges at most one bounded page per source, then hydrates only selected records.
  if (q.view === "reviews") {
    const sources = [
      [
        "proposals",
        "Timetable",
        { state: "Submitted" },
        scopedJoin,
        "snapshot.effective",
      ],
      [
        "requests",
        "request",
        {
          status: {
            $in:
              q.urgent === "true"
                ? ["Escalated"]
                : [
                    "Submitted",
                    "Open",
                    "In review",
                    "Awaiting checks",
                    "Escalated",
                  ],
          },
        },
        requestAccess,
        "",
      ],
      ["venueChanges", "change", { state: "Submitted" }, scopedJoin, ""],
      ["notices", "Notice", { state: "Submitted" }, scopedJoin, "event"],
      [
        "venues",
        "registration",
        {
          $and: [
            scope,
            {
              status: "Draft",
              registrationState: { $nin: ["Returned", "Rejected"] },
            },
          ],
        },
        [],
        "",
      ],
    ] as const;
    const candidates = (
      await Promise.all(
        sources.map(async ([collection, type, match, access, due]) => {
          if (
            (q.urgent === "true" || q.kind === "escalation") &&
            !["requests", "proposals"].includes(collection)
          )
            return [];
          const extra: Document[] = [...access];
          if (collection === "proposals" && q.urgent === "true")
            extra.push(
              {
                $lookup: {
                  from: "escalations",
                  localField: "_id",
                  foreignField: "proposalId",
                  pipeline: [{ $limit: 1 }],
                  as: "_escalated",
                },
              },
              { $match: { "_escalated.0": { $exists: true } } },
            );
          if (collection === "requests" && q.kind === "escalation")
            extra.push({ $match: { status: "Escalated" } });
          if (collection === "venues")
            extra.push(
              {
                $lookup: {
                  from: "registrationDecisions",
                  localField: "_id",
                  foreignField: "venueId",
                  pipeline: [{ $sort: { at: -1 } }, { $limit: 1 }],
                  as: "_decision",
                },
              },
              {
                $match: {
                  $expr: {
                    $eq: [
                      {
                        $ifNull: [
                          "$registrationState",
                          {
                            $ifNull: [
                              { $arrayElemAt: ["$_decision.decision", 0] },
                              "Submitted",
                            ],
                          },
                        ],
                      },
                      "Submitted",
                    ],
                  },
                },
              },
            );
          if (q.kind && !["All", "escalation"].includes(q.kind)) {
            if (["request", "change"].includes(type))
              extra.push({ $match: { kind: q.kind } });
            else if (q.kind !== type) return [];
          }
          if (q.due !== "all") {
            if (!due) return [];
            extra.push({
              $match: {
                [due]: { [q.due === "past" ? "$lte" : "$gt"]: q.date },
              },
            });
          }
          if (q.venue)
            extra.push({
              $match: {
                [collection === "venues" ? "_id" : "venueId"]: q.venue,
              },
            });
          extra.push({
            $match: filter(["_id", "title", "name", "_venue.name"]),
          });
          return (await read(collection, pageStages(match, extra))).map(
            (row) => ({ ...row, _source: collection, _type: type }),
          );
        }),
      )
    )
      .flat()
      .sort((a, b) => a._id.localeCompare(b._id));
    primary = candidates;
    for (const row of candidates.slice(0, q.limit)) {
      const source = row._source;
      if (source === "proposals")
        result.proposals.push(row as unknown as Proposal);
      if (source === "requests")
        result.requests.push(row as unknown as PublicRequest);
      if (source === "venueChanges")
        result.changes.push(row as unknown as Change);
      if (source === "notices") result.notices.push(row as unknown as Notice);
      if (source === "venues") result.visible.push(row as unknown as Venue);
    }
  }
  if (q.view === "discovery") {
    const discovery = await discover(d, scope, q);
    primary = discovery.rows;
    result.visible = unique(
      discovery.rows.slice(0, q.limit).map(({ _session, _sort, ...v }) => v),
    ) as unknown as Venue[];
    result.discoverySessions = discovery.rows
      .slice(0, q.limit)
      .map((v) => ({ ...v._session, venueId: v._id }));
    result.page.nextCursor = discovery.nextCursor;
  } else
    result.page.nextCursor =
      primary.length > q.limit ? primary[q.limit - 1]!._id : null;
  result.page.ids = primary.slice(0, q.limit).map((x) => x._id);

  if (actor && q.view === "dashboard") {
    result.proposals = (await read(
      "proposals",
      [
        { $match: { state: "Submitted" } },
        ...scopedJoin,
        { $sort: { createdAt: 1, _id: 1 } },
      ],
      4,
    )) as unknown as Proposal[];
    result.audit = (await read(
      "audit",
      [
        ...(actor.role === "admin" ? [] : scopedJoin),
        { $sort: { at: -1, _id: -1 } },
      ],
      4,
    )) as unknown as Audit[];
  }
  if (actor && q.view === "proposal") {
    result.audit = (await read(
      "audit",
      [
        {
          $match: { venueId: { $in: result.proposals.map((p) => p.venueId) } },
        },
        ...scopedJoin,
        { $sort: { at: -1, _id: -1 } },
      ],
      5,
    )) as unknown as Audit[];
  }
  const referenced = [
    ...result.proposals,
    ...result.notices,
    ...result.requests,
    ...result.changes,
    ...result.audit,
  ]
    .map((x) => x.venueId)
    .filter((x): x is string => !!x);
  if (q.venue) referenced.push(q.venue);
  result.visible = unique([
    ...result.visible,
    ...(await d.venues
      .find({ $and: [scope, { _id: { $in: referenced } }] })
      .toArray()),
  ]);
  const ids = result.visible.map((v) => v._id);
  // Resolve effective heads per venue/date, independently of history pagination.
  const heads = await d.venues
    .aggregate<Proposal>(
      [
        { $match: { _id: { $in: ids } } },
        {
          $lookup: {
            from: "proposals",
            localField: "_id",
            foreignField: "venueId",
            pipeline: [
              {
                $match: {
                  state: "Approved",
                  "snapshot.effective": { $lte: q.date },
                },
              },
              { $sort: { "snapshot.effective": -1, version: -1 } },
              { $limit: 1 },
            ],
            as: "head",
          },
        },
        { $unwind: "$head" },
        { $replaceRoot: { newRoot: "$head" } },
      ],
      { maxTimeMS: 5000 },
    )
    .toArray();
  result.pending = await d.proposals
    .find({ venueId: { $in: ids }, state: "Submitted" })
    .toArray();
  const nextHeads =
    q.view === "venue"
      ? await d.venues
          .aggregate<Proposal>([
            { $match: { _id: { $in: ids } } },
            {
              $lookup: {
                from: "proposals",
                localField: "_id",
                foreignField: "venueId",
                pipeline: [
                  {
                    $match: {
                      state: "Approved",
                      "snapshot.effective": { $gt: q.date },
                    },
                  },
                  { $sort: { "snapshot.effective": 1, version: -1 } },
                  { $limit: 1 },
                ],
                as: "head",
              },
            },
            { $unwind: "$head" },
            { $replaceRoot: { newRoot: "$head" } },
          ])
          .toArray()
      : [];
  result.proposals = unique([
    ...result.proposals,
    ...heads,
    ...nextHeads,
    ...(actor ? result.pending : []),
  ]);
  if (actor)
    result.escalatedIds = (
      await d.db
        .collection("escalations")
        .find(
          { proposalId: { $in: result.proposals.map((p) => p._id) } },
          { projection: { proposalId: 1 } },
        )
        .toArray()
    ).map((row) => String(row.proposalId));
  if (actor) {
    const reportCounts = await d.requests
      .aggregate([
        {
          $match: {
            venueId: { $in: ids },
            kind: "report",
            status: { $nin: ["Resolved", "Dismissed"] },
          },
        },
        { $group: { _id: "$venueId", count: { $sum: 1 } } },
      ])
      .toArray();
    for (const item of reportCounts)
      result.counts["reports:" + item._id] = item.count;
  }
  const areaIds = [
    ...result.visible.map((v) => v.areaId),
    ...result.requests.map((r) => r.areaId),
    ...result.accounts.flatMap((a) => a.areaIds),
  ].filter((value): value is string => typeof value === "string");
  result.areas = unique([
    ...result.areas,
    ...(await d.areas.find({ _id: { $in: areaIds } }).toArray()),
  ]);
  if (["form", "none", "dashboard"].includes(q.view))
    result.areas = unique([
      ...result.areas,
      ...(await d.areas
        .find(areaScope)
        .sort({ _id: 1 })
        .limit(q.limit)
        .toArray()),
    ]);
  if (actor) {
    result.contacts = await d.contacts
      .find({ venueId: { $in: ids } })
      .toArray();
    const related = [
      actor._id,
      ...result.visible.flatMap((v) => [v.repId, v.focalId]),
      ...result.audit.map((a) => a.actorId),
    ].filter((value): value is string => typeof value === "string");
    result.counts.unread = await d.notifications.countDocuments({
      accountId: actor._id,
      read: false,
    });
    result.accounts = unique([
      ...result.accounts,
      ...(await d.accounts
        .find({ $and: [accountScope, { _id: { $in: related } }] })
        .toArray()),
    ]);
    result.registrationDecisions = await d.db
      .collection("registrationDecisions")
      .aggregate([
        { $match: { venueId: { $in: ids } } },
        { $sort: { at: -1 } },
        { $group: { _id: "$venueId", item: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$item" } },
      ])
      .toArray();
  }
  result.disputes = await d.disputes
    .find({ venueId: { $in: ids }, active: true, date: q.date })
    .toArray();
  if (["venue", "dashboard"].includes(q.view))
    result.notices = await d.notices
      .find({
        venueId: { $in: ids },
        state: "Published",
        expires: { $gt: new Date().toISOString() },
      })
      .sort({ _id: 1 })
      .limit(q.limit)
      .toArray();
  if (q.view === "areas") {
    for (const a of result.areas)
      result.areaCounts[a._id] = await d.venues.countDocuments({
        $and: [scope, { areaId: a._id }],
      });
  }
  if (q.view === "dashboard") {
    result.counts.venues = await d.venues.countDocuments(scope);
    result.counts.maintenance = await d.venues.countDocuments({
      $and: [scope, { status: { $ne: "Published" } }],
    });
    const counts = await d.proposals
      .aggregate([
        { $match: { state: "Submitted" } },
        ...scopedJoin,
        { $count: "count" },
      ])
      .toArray();
    result.counts.pending = counts[0]?.count || 0;
    const reports = await d.requests
      .aggregate([
        {
          $match: {
            kind: "report",
            status: { $nin: ["Resolved", "Dismissed"] },
          },
        },
        ...requestAccess,
        { $count: "count" },
      ])
      .toArray();
    result.counts.reports = reports[0]?.count || 0;
  }
  return result;
}

async function discover(d: Database, scope: Document, q: ScreenQuery) {
  const match: Document = {
    $and: [scope, ...(q.city ? [{ city: q.city }] : [])],
  };
  if (q.area)
    match.$and.push({
      areaId: {
        $in: (
          await d.areas
            .find({ name: q.area }, { projection: { _id: 1 } })
            .toArray()
        ).map((a) => a._id),
      },
    });
  if (q.scope === "nearby") {
    assert(
      q.lat !== undefined && q.lng !== undefined,
      422,
      "ORIGIN_REQUIRED",
      "Select a precise origin for Nearby.",
    );
    match.entrance = {
      $geoWithin: { $centerSphere: [[q.lng, q.lat], q.radius / 6371] },
    };
  }
  const stages: Document[] = [
    { $match: match },
    {
      $lookup: {
        from: "proposals",
        localField: "_id",
        foreignField: "venueId",
        pipeline: [
          {
            $match: {
              state: "Approved",
              "snapshot.effective": { $lte: q.date },
            },
          },
          { $sort: { "snapshot.effective": -1, version: -1 } },
          { $limit: 1 },
        ],
        as: "_head",
      },
    },
    {
      $set: {
        _snapshot: {
          $ifNull: [{ $arrayElemAt: ["$_head.snapshot", 0] }, "$initial"],
        },
      },
    },
    { $match: { "_snapshot.effective": { $lte: q.date } } },
    {
      $set: {
        _dated: {
          $filter: {
            input: "$_snapshot.special",
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
        _session: {
          $cond: [
            { $gt: [{ $size: "$_dated" }, 0] },
            "$_dated",
            q.prayer === "Dhuhr" &&
            new Date(q.date + "T12:00:00+05:00").getUTCDay() === 5
              ? []
              : [
                  {
                    id: "daily",
                    prayer: q.prayer,
                    date: q.date,
                    time: "$_snapshot.times." + q.prayer,
                    canceled: false,
                    provisional: false,
                    khutbah: "",
                  },
                ],
          ],
        },
      },
    },
    { $unwind: "$_session" },
    {
      $match: {
        "_session.canceled": false,
        "_session.time": { $type: "string", $ne: "" },
      },
    },
    {
      $match: {
        $expr: {
          $gt: [
            {
              $dateFromString: {
                dateString: {
                  $concat: [q.date, "T", "$_session.time", ":00+05:00"],
                },
                onError: null,
              },
            },
            new Date(),
          ],
        },
      },
    },
    { $set: { _sort: q.sort === "name" ? "$name" : "$_session.time" } },
  ];
  if (q.cursor) {
    let cursor: { key: string; id: string; session: string };
    try {
      cursor = z
        .object({ key: z.string().max(300), id, session: z.string().max(100) })
        .strict()
        .parse(JSON.parse(Buffer.from(q.cursor, "base64url").toString()));
    } catch {
      assert(
        false,
        422,
        "INVALID_CURSOR",
        "The page link is invalid. Return to the first page.",
      );
    }
    stages.push({
      $match: {
        $or: [
          { _sort: { $gt: cursor.key } },
          { _sort: cursor.key, _id: { $gt: cursor.id } },
          {
            _sort: cursor.key,
            _id: cursor.id,
            "_session.id": { $gt: cursor.session },
          },
        ],
      },
    });
  }
  stages.push(
    { $sort: { _sort: 1, _id: 1, "_session.id": 1 } },
    { $limit: q.limit + 1 },
    { $unset: ["_head", "_snapshot", "_dated"] },
  );
  const rows = await d.venues
    .aggregate<Row>(stages, { maxTimeMS: 5000 })
    .toArray();
  const last = rows[q.limit - 1];
  return {
    rows,
    nextCursor:
      rows.length > q.limit && last
        ? Buffer.from(
            JSON.stringify({
              key: last._sort,
              id: last._id,
              session: last._session.id,
            }),
          ).toString("base64url")
        : null,
  };
}
