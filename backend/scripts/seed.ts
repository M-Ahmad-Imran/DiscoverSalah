import { randomUUID } from "node:crypto";
import { config } from "../src/config/env.js";
import { connect, indexes } from "../src/db/database.js";
import { encrypt, keyed, hashPassword } from "../src/lib/crypto.js";
import { today, password } from "../src/lib/validation.js";
const c = config();
if (c.NODE_ENV === "production" || !c.DB_NAME.endsWith("_demo"))
  throw Error(
    "Demo seed requires a database name ending in _demo and non-production mode.",
  );
const pass = password.parse(process.env.DEMO_PASSWORD);
const d = await connect(c);
try {
  await indexes(d);
  if (await d.accounts.countDocuments())
    throw Error("Seed requires an empty account collection.");
  const areaId = randomUUID(),
    repId = randomUUID(),
    focalId = randomUUID(),
    venueId = randomUUID();
  for (const [id, role, number] of [
    [repId, "representative", "+12025550101"],
    [focalId, "focal", "+12025550102"],
  ] as const)
    await d.accounts.insertOne({
      _id: id,
      name: "Synthetic " + role,
      role,
      areaIds: [areaId],
      active: true,
      phoneHash: keyed(number, c.TOKEN_KEY),
      phoneCipher: encrypt(number, c.DATA_KEY),
      contactVerifiedAt: new Date(),
      passwordHash: await hashPassword(pass),
      authVersion: 0,
      fence: 0,
      createdAt: new Date(),
    });
  await d.areas.insertOne({
    _id: areaId,
    name: "Sample area",
    city: "Sample city",
    focalId,
    revision: 0,
  });
  await d.venues.insertOne({
    _id: venueId,
    name: "Synthetic Mosque",
    urdu: "نمونہ مسجد",
    areaId,
    city: "Sample city",
    address: "Synthetic location; not a real listing",
    entrance: { type: "Point", coordinates: [74.3, 31.5] },
    kind: "Mosque",
    facilities: { Wudu: "Unknown" },
    status: "Published",
    repId,
    focalId,
    revision: 0,
    authorId: repId,
    initial: {
      times: {
        Fajr: "05:20",
        Dhuhr: "13:30",
        Asr: "16:15",
        Maghrib: "17:40",
        Isha: "19:15",
      },
      special: [],
      effective: today(),
      reason: "Synthetic fixture",
    },
    identityApprovedAt: new Date(),
    createdAt: new Date(),
  });
  await d.contacts.insertOne({
    _id: randomUUID(),
    venueId,
    phoneCipher: encrypt("+12025550103", c.DATA_KEY),
    nameCipher: encrypt("Synthetic Imam", c.DATA_KEY),
    permission: true,
    verifiedAt: new Date(),
  });
  console.info(
    "Synthetic accounts created: representative +12025550101; focal +12025550102. Use DEMO_PASSWORD. No messages were sent.",
  );
} finally {
  await d.client.close();
}
