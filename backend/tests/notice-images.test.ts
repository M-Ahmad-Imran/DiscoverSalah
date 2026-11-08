import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import request from "supertest";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { Database, indexes } from "../src/db/database.js";
import { createApp } from "../src/app.js";
import { config, type Config } from "../src/config/env.js";
import { encrypt, digest, keyed } from "../src/lib/crypto.js";
import { cleanNoticeImages } from "../src/workers/notice-images.js";
import {
  CloudinaryImages,
  MAX_IMAGE_BYTES,
  MAX_STORED_IMAGE_BYTES,
  compressNoticeImage,
  type ImageStorage,
} from "../src/providers/images.js";
import type { Account, Venue } from "../src/db/models.js";

const c: Config = {
  NODE_ENV: "test",
  PORT: 4000,
  MONGODB_URI: "unused",
  DB_NAME: "image_tests",
  WEB_ORIGIN: "http://localhost:5173",
  DATA_KEY: "ab".repeat(32),
  TOKEN_KEY: "cd".repeat(32),
  SESSION_HOURS: 8,
  TRUST_PROXY_HOPS: 0,
  PHONE_PROVIDER: "disabled",
  PHONE_PROVIDER_URL: "",
  PHONE_PROVIDER_TOKEN: "",
};
const jpg = Buffer.from([255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 0, 0]);
let mongo: MongoMemoryReplSet,
  d: Database,
  app: ReturnType<typeof createApp>,
  venue: Venue;
let rep: Account, focal: Account, outsider: Account;
let uploads = 0,
  deletes = 0,
  failDelete = false,
  failUpload = false;
const storage: ImageStorage = {
  enabled: true,
  namespace: "training",
  async upload() {
    uploads++;
    if (failUpload) throw Error("temporary upload error");
    return { width: 100, height: 100, bytes: 16, version: 123 };
  },
  async read() {
    return Buffer.from("RIFF0000WEBPtest");
  },
  async destroy() {
    deletes++;
    if (failDelete) throw Error("temporary delete error");
  },
};
before(
  async () => {
    mongo = await MongoMemoryReplSet.create({
      instanceOpts: [{ launchTimeout: 60000 }],
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    const client = await new MongoClient(mongo.getUri()).connect();
    d = new Database(client, client.db("image_tests"));
    await indexes(d);
  },
  { timeout: 180000 },
);
after(async () => {
  await d?.client.close();
  await mongo?.stop();
});
beforeEach(async () => {
  for (const collection of await d.db.collections())
    await collection.deleteMany({});
  uploads = 0;
  deletes = 0;
  failDelete = false;
  failUpload = false;
  const areaId = randomUUID();
  function account(role: Account["role"]): Account {
    const id = randomUUID();
    return {
      _id: id,
      name: role,
      role,
      areaIds: [areaId],
      active: true,
      authVersion: 0,
      fence: 0,
      phoneHash: keyed(id, c.TOKEN_KEY),
      phoneCipher: encrypt("+12025550101", c.DATA_KEY),
      createdAt: new Date(),
    };
  }
  rep = account("representative");
  focal = account("focal");
  outsider = account("representative");
  await d.accounts.insertMany([rep, focal, outsider]);
  await d.areas.insertOne({
    _id: areaId,
    name: "Training area",
    city: "Training city",
    focalId: focal._id,
    revision: 0,
  });
  venue = {
    _id: randomUUID(),
    name: "Training mosque",
    urdu: "مسجد",
    areaId,
    city: "Training city",
    address: "Training address",
    entrance: { type: "Point", coordinates: [74.3, 31.5] },
    kind: "Mosque",
    facilities: {},
    status: "Published",
    repId: rep._id,
    focalId: focal._id,
    revision: 0,
    authorId: rep._id,
    initial: {
      times: {
        Fajr: "05:00",
        Dhuhr: "13:00",
        Asr: "16:00",
        Maghrib: "18:00",
        Isha: "20:00",
      },
      special: [],
      effective: "2026-01-01",
      reason: "Training timetable",
    },
    createdAt: new Date(),
  };
  await d.venues.insertOne(venue);
  for (const a of [rep, focal, outsider])
    await d.sessions.insertOne({
      _id: digest(a._id),
      accountId: a._id,
      authVersion: 0,
      csrfHash: digest("test-csrf"),
      mfa: false,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    });
  app = createApp(d, c, undefined, storage);
});
function post(path: string, actor = rep, key = randomUUID()) {
  return request(app)
    .post("/api/v1/management" + path)
    .set("Origin", c.WEB_ORIGIN)
    .set("Cookie", "ds-session=" + actor._id)
    .set("X-CSRF-Token", "test-csrf")
    .set("Idempotency-Key", key);
}
function upload(actor = rep, key = randomUUID(), data = jpg) {
  return post("/notice-images?venueId=" + venue._id, actor, key)
    .set("Content-Type", "application/octet-stream")
    .send(data);
}
function content(imageId?: string, expires = Date.now() + 1800000) {
  return {
    venueId: venue._id,
    title: "Training notice",
    body: "A community lesson.",
    category: "Religious event",
    event: new Date(Date.now() + 60000).toISOString(),
    expires: new Date(expires).toISOString(),
    source: "Authorized mosque committee",
    ...(imageId ? { imageId } : {}),
  };
}
async function attach(imageId: string, expires?: number) {
  const r = await post("/notices").send(content(imageId, expires));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.id as string;
}

test("missing storage disables only uploads, and partial credentials fail startup", async () => {
  const disabled = createApp(d, c);
  const response = await request(disabled)
    .post("/api/v1/management/notice-images?venueId=" + venue._id)
    .set("Origin", c.WEB_ORIGIN)
    .set("Cookie", "ds-session=" + rep._id)
    .set("X-CSRF-Token", "test-csrf")
    .set("Content-Type", "application/octet-stream")
    .send(jpg);
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, "IMAGE_STORAGE_DISABLED");
  assert.equal((await post("/notices").send(content())).status, 201);
  assert.throws(
    () =>
      config({
        ...c,
        CLOUDINARY_CLOUD_NAME: "demo",
      } as unknown as NodeJS.ProcessEnv),
    /all three/,
  );
});
test("upload enforces login, origin, CSRF, venue scope, format and size", async () => {
  assert.equal(
    (
      await request(app)
        .post("/api/v1/management/notice-images?venueId=" + venue._id)
        .set("Origin", c.WEB_ORIGIN)
        .set("Content-Type", "application/octet-stream")
        .send(jpg)
    ).status,
    401,
  );
  assert.equal(
    (await upload().set("Origin", "https://other.example")).status,
    403,
  );
  assert.equal((await upload().set("X-CSRF-Token", "bad")).status, 403);
  assert.equal((await upload(outsider)).status, 404);
  assert.equal(
    (
      await upload(
        rep,
        randomUUID(),
        Buffer.from('<svg onload="alert(1)"></svg>'),
      )
    ).status,
    422,
  );
  assert.equal(
    (await upload(rep, randomUUID(), Buffer.alloc(MAX_IMAGE_BYTES + 1))).status,
    413,
  );
  assert.equal(uploads, 0);
});
test("upload retries are idempotent; a different payload cannot reuse the key", async () => {
  const key = randomUUID(),
    one = await upload(rep, key),
    two = await upload(rep, key);
  assert.equal(one.status, 201, JSON.stringify(one.body));
  assert.equal(two.body.id, one.body.id);
  assert.equal(uploads, 1);
  assert.equal(
    (await upload(rep, key, Buffer.concat([jpg, Buffer.from("other")]))).status,
    409,
  );
  assert.equal(
    (
      await request(app)
        .get(one.body.previewUrl)
        .set("Cookie", "ds-session=" + rep._id)
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .get(one.body.previewUrl)
        .set("Cookie", "ds-session=" + outsider._id)
    ).status,
    404,
  );
  assert.equal(
    (
      await request(app)
        .get(one.body.previewUrl)
        .set("Cookie", "ds-session=" + focal._id)
    ).status,
    200,
  );
});
test("pending images stay private; only independent approval exposes them, expiry hides without worker", async () => {
  const image = (await upload()).body.id;
  const nid = await attach(image);
  const url = "/api/v1/notices/" + nid + "/image";
  assert.equal((await request(app).get(url)).status, 404);
  assert.equal(
    (
      await request(app)
        .get("/api/v1/management/notices/" + nid + "/image")
        .set("Cookie", "ds-session=" + focal._id)
    ).status,
    200,
  );
  const decision = {
    revision: 0,
    decision: "Published",
    reason: "Source and image independently checked",
    sourcePrivacyChecked: true,
  };
  assert.equal(
    (await post("/notices/" + nid + "/decision").send(decision)).status,
    403,
  );
  assert.equal(
    (await post("/notices/" + nid + "/decision", focal).send(decision)).status,
    200,
  );
  const publicImage = await request(app).get(url);
  assert.equal(publicImage.status, 200);
  assert.equal(publicImage.headers["cache-control"], "private, no-store");
  assert.match(publicImage.headers["content-type"] || "", /image\/webp/);
  const dto = await request(app).get("/api/v1/notices/" + nid);
  assert.equal(dto.body.imageUrl, url);
  assert.equal(dto.body.imageId, undefined);
  assert.equal(JSON.stringify(dto.body).includes("publicId"), false);
  await d.notices.updateOne(
    { _id: nid },
    { $set: { expires: new Date(Date.now() - 1000).toISOString() } },
  );
  assert.equal((await request(app).get(url)).status, 404);
  assert.equal(deletes, 0);
});
test("attachments reject other owners, other mosques and arbitrary image URLs", async () => {
  const image = (await upload()).body.id;
  assert.equal(
    (await post("/notices", focal).send(content(image))).status,
    422,
  );
  assert.equal(
    (
      await post("/notices").send({
        ...content(),
        imageUrl: "https://example.com/image.jpg",
      })
    ).status,
    422,
  );
  await d.noticeImages.updateOne(
    { _id: image },
    { $set: { venueId: randomUUID() } },
  );
  assert.equal((await post("/notices").send(content(image))).status, 422);
});
test("first attachment uses exact expiry; shared image remains until the latest expiry", async () => {
  const image = (await upload()).body.id;
  const first = Date.now() + 300000,
    last = Date.now() + 7200000;
  await attach(image, first);
  assert.equal(
    (await d.noticeImages.findOne({ _id: image }))!.deleteAfter.getTime(),
    first,
  );
  await attach(image, last);
  await attach(image, first);
  assert.equal(
    (await d.noticeImages.findOne({ _id: image }))!.deleteAfter.getTime(),
    last,
  );
  assert.equal(await cleanNoticeImages(d, storage), 0);
  assert.equal(deletes, 0);
  await d.noticeImages.updateOne(
    { _id: image },
    { $set: { deleteAfter: new Date(0) } },
  );
  assert.equal(await cleanNoticeImages(d, storage), 1);
  assert.equal(deletes, 1);
  assert.equal(await d.notices.countDocuments({ imageId: image }), 3);
  assert.equal(
    (await d.noticeImages.findOne({ _id: image }))!.state,
    "deleted",
  );
});
test("cleanup retries failures, recovers leases and blocks attaching an image being deleted", async () => {
  const image = (await upload()).body.id;
  await d.noticeImages.updateOne(
    { _id: image },
    { $set: { deleteAfter: new Date(0) } },
  );
  failDelete = true;
  assert.equal(await cleanNoticeImages(d, storage), 1);
  const pending = await d.noticeImages.findOne({ _id: image });
  assert.equal(pending!.state, "deleting");
  assert.ok(pending!.leaseUntil > new Date());
  assert.equal(await cleanNoticeImages(d, storage), 0);
  assert.equal((await post("/notices").send(content(image))).status, 422);
  failDelete = false;
  await d.noticeImages.updateOne(
    { _id: image },
    { $set: { leaseUntil: new Date(0) } },
  );
  assert.equal(await cleanNoticeImages(d, storage), 1);
  assert.equal(deletes, 2);
  assert.equal(await cleanNoticeImages(d, storage), 0);
});
test("abandoned and uncertain uploads remain tracked for deletion", async () => {
  failUpload = true;
  const result = await upload();
  assert.equal(result.status, 500);
  const asset = await d.noticeImages.findOne({});
  assert.equal(asset!.state, "uploading");
  await d.noticeImages.updateOne(
    { _id: asset!._id },
    { $set: { deleteAfter: new Date(0) } },
  );
  assert.equal(await cleanNoticeImages(d, storage), 1);
  assert.equal(deletes, 1);
});
test("cancellation immediately removes public image access", async () => {
  const image = (await upload()).body.id;
  const nid = await attach(image);
  await post("/notices/" + nid + "/decision", focal).send({
    revision: 0,
    decision: "Published",
    reason: "Independently verified",
    sourcePrivacyChecked: true,
  });
  assert.equal(
    (
      await post("/notices/" + nid + "/decision").send({
        revision: 1,
        decision: "Canceled",
        reason: "The event is canceled",
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(app).get("/api/v1/notices/" + nid + "/image")).status,
    404,
  );
});
test("Cloudinary adapter signs locally compressed private uploads, proxies bytes, invalidates deletion", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const http = (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/image/upload"))
      return Response.json({
        public_id: "discoversalah/notices/test",
        resource_type: "image",
        type: "authenticated",
        format: "webp",
        width: 100,
        height: 80,
        bytes: 16,
        version: 123,
      });
    if (String(url).includes("/destroy"))
      return Response.json({ result: "not found" });
    return new Response(Buffer.from("RIFF0000WEBPtest"), {
      headers: { "content-type": "image/webp" },
    });
  }) as typeof fetch;
  const provider = new CloudinaryImages(
    {
      ...c,
      CLOUDINARY_CLOUD_NAME: "training",
      CLOUDINARY_API_KEY: "key",
      CLOUDINARY_API_SECRET: "secret",
    },
    http,
  );
  const validJpg = await sharp({
    create: { width: 100, height: 80, channels: 3, background: "#16755b" },
  })
    .jpeg()
    .toBuffer();
  await provider.upload("discoversalah/notices/test", validJpg);
  const form = calls[0]!.init!.body as FormData;
  assert.equal(form.get("type"), "authenticated");
  assert.equal(form.get("backup"), "false");
  assert.equal(form.get("overwrite"), "false");
  assert.equal(form.get("transformation"), null);
  assert.equal(form.get("format"), null);
  const uploaded = Buffer.from(await (form.get("file") as Blob).arrayBuffer());
  assert.equal((await sharp(uploaded).metadata()).format, "webp");
  assert.ok(uploaded.length <= MAX_STORED_IMAGE_BYTES);
  const signed = [...form.entries()]
    .filter(([key]) => !["file", "api_key", "signature"].includes(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value)
    .join("&");
  assert.equal(
    form.get("signature"),
    createHash("sha256")
      .update(signed + "secret")
      .digest("hex"),
  );
  const image = {
    _id: "test",
    publicId: "discoversalah/notices/test",
    storageCloud: "training",
    version: 123,
  } as Parameters<ImageStorage["read"]>[0];
  assert.ok((await provider.read(image)).length);
  const sig = createHash("sha1")
    .update("v123/discoversalah/notices/test.webpsecret")
    .digest("base64url")
    .slice(0, 8);
  assert.equal(
    calls[1]!.url,
    `https://res.cloudinary.com/training/image/authenticated/s--${sig}--/v123/discoversalah/notices/test.webp`,
  );
  await provider.destroy(image.publicId);
  assert.equal((calls[2]!.init!.body as FormData).get("invalidate"), "true");
});

test("complex images cannot exceed the stored-image cap", async () => {
  const input = await sharp(randomBytes(1600 * 1600 * 3), {
    raw: { width: 1600, height: 1600, channels: 3 },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  assert.ok(input.length < MAX_IMAGE_BYTES);
  await assert.rejects(compressNoticeImage(input), {
    code: "IMAGE_TOO_COMPLEX",
  });
});

test("local compression limits dimensions, removes metadata, preserves orientation and avoids enlargement", async () => {
  const original = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#16755b" },
  })
    .withMetadata({ orientation: 6 })
    .png()
    .toBuffer();
  const compressed = await compressNoticeImage(original),
    meta = await sharp(compressed).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 800);
  assert.equal(meta.height, 1600);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.orientation, undefined);
  assert.ok(compressed.length < original.length);
  const small = await sharp({
    create: { width: 100, height: 80, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const smallMeta = await sharp(await compressNoticeImage(small)).metadata();
  assert.equal(smallMeta.width, 100);
  assert.equal(smallMeta.height, 80);
});

test("compression rejects corrupt and excessive-pixel inputs before contacting storage", async () => {
  let calls = 0;
  const provider = new CloudinaryImages(
    {
      ...c,
      CLOUDINARY_CLOUD_NAME: "training",
      CLOUDINARY_API_KEY: "key",
      CLOUDINARY_API_SECRET: "secret",
    },
    (async () => {
      calls++;
      return Response.json({});
    }) as typeof fetch,
  );
  await assert.rejects(provider.upload("test", jpg), { code: "INVALID_IMAGE" });
  const large = await sharp({
    create: { width: 5000, height: 5000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(provider.upload("test", large), {
    code: "INVALID_IMAGE",
  });
  assert.equal(calls, 0);
});
