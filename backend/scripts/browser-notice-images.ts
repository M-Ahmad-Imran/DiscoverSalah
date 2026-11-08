import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { Database, indexes } from "../src/db/database.js";
import type { Config } from "../src/config/env.js";
import type { Account, Venue } from "../src/db/models.js";
import { encrypt, hashPassword, keyed } from "../src/lib/crypto.js";
import { ApiError } from "../src/lib/errors.js";
import {
  compressNoticeImage,
  type ImageStorage,
} from "../src/providers/images.js";
import { cleanNoticeImages } from "../src/workers/notice-images.js";
const { chromium } = createRequire(import.meta.url)(
  "../../frontend/node_modules/playwright",
);
const c: Config = {
  NODE_ENV: "test",
  PORT: 4107,
  MONGODB_URI: "unused",
  DB_NAME: "notice_browser",
  WEB_ORIGIN: "http://127.0.0.1:5177",
  DATA_KEY: "ab".repeat(32),
  TOKEN_KEY: "cd".repeat(32),
  SESSION_HOURS: 8,
  TRUST_PROXY_HOPS: 0,
  PHONE_PROVIDER: "disabled",
  PHONE_PROVIDER_URL: "",
  PHONE_PROVIDER_TOKEN: "",
};
const mongo = await MongoMemoryReplSet.create({
  instanceOpts: [{ launchTimeout: 60000 }],
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
const client = await new MongoClient(mongo.getUri()).connect();
const d = new Database(client, client.db(c.DB_NAME));
let browser: any,
  server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined,
  vite: ReturnType<typeof spawn> | undefined;
try {
  await indexes(d);
  const areaId = randomUUID(),
    password = "synthetic notice test password",
    passwordHash = await hashPassword(password);
  const account = (role: Account["role"], phone: string): Account => ({
    _id: randomUUID(),
    name: `Test ${role}`,
    role,
    areaIds: [areaId],
    active: true,
    authVersion: 0,
    fence: 0,
    phoneHash: keyed(phone, c.TOKEN_KEY),
    phoneCipher: encrypt(phone, c.DATA_KEY),
    passwordHash,
    contactConfirmedAt: new Date(),
    createdAt: new Date(),
  });
  const rep = account("representative", "+12025550101"),
    focal = account("focal", "+12025550102");
  await d.accounts.insertMany([rep, focal]);
  await d.areas.insertOne({
    _id: areaId,
    name: "Test area",
    city: "Test city",
    focalId: focal._id,
    revision: 0,
  });
  const venue: Venue = {
    _id: randomUUID(),
    name: "Test Mosque",
    urdu: "ٹیسٹ مسجد",
    areaId,
    city: "Test city",
    address: "Test address",
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
      reason: "Test initial",
    },
    createdAt: new Date(),
  };
  await d.venues.insertOne(venue);
  const second = { ...venue, _id: randomUUID(), name: "Second Test Mosque" };
  await d.venues.insertOne(second);
  const assets = new Map<string, Buffer>();
  let failNext = true,
    uploadCalls = 0;
  const storage: ImageStorage = {
    enabled: true,
    namespace: "browser-test",
    async upload(id, input) {
      uploadCalls++;
      if (failNext) {
        failNext = false;
        throw new ApiError(
          503,
          "IMAGE_PROCESSING_BUSY",
          "Please retry this image upload.",
        );
      }
      const bytes = await compressNoticeImage(input);
      assets.set(id, bytes);
      const meta = await sharp(bytes).metadata();
      return {
        width: meta.width!,
        height: meta.height!,
        bytes: bytes.length,
        version: 1,
      };
    },
    async read(image) {
      const bytes = assets.get(image.publicId);
      assert.ok(bytes);
      return bytes;
    },
    async destroy(id) {
      assets.delete(id);
    },
  };
  server = createApp(d, c, undefined, storage).listen(c.PORT, "127.0.0.1");
  vite = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "5177",
      "--strictPort",
    ],
    {
      cwd: new URL("../../frontend/", import.meta.url),
      env: { ...process.env, API_PROXY_TARGET: "http://127.0.0.1:4107" },
      windowsHide: true,
      stdio: "ignore",
    },
  );
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(c.WEB_ORIGIN)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const repContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    focalContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    publicContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
  const page = await repContext.newPage(),
    review = await focalContext.newPage(),
    visitor = await publicContext.newPage();
  const errors: string[] = [];
  async function go(url: string) {
    await page.goto(url);
    await page.locator("input[type=file]").waitFor();
    if (await page.locator("aside.sidebar.open").count())
      await page.keyboard.press("Escape");
  }
  for (const p of [page, review, visitor]) {
    p.setDefaultTimeout(20000);
    p.on("pageerror", (e: Error) => errors.push(e.message));
    p.on("dialog", (dialog: any) => void dialog.accept());
  }
  async function login(p: any, phone: string) {
    await p.goto(c.WEB_ORIGIN + "/sign-in");
    await p.locator("[name=contactNumber]").fill(phone);
    await p.locator("[name=password]").fill(password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await p.waitForURL("**/manage");
  }
  await login(page, "+12025550101");
  await go(c.WEB_ORIGIN + "/manage/notices/new?venue=" + venue._id);
  const file = page.locator("input[type=file]");
  await file.waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLInputElement>("input[type=file]")?.disabled,
  );
  await file.setInputFiles({
    name: "unsafe.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await page.getByRole("alert").filter({ hasText: "Choose a JPG" }).waitFor();
  assert.equal(uploadCalls, 0);
  const poster = await sharp(
    Buffer.from(
      '<svg width="1800" height="1200"><rect width="100%" height="100%" fill="#15765b"/><text x="120" y="450" font-size="110" fill="white">Community lesson</text><text x="120" y="650" font-size="65" fill="white">Everyone is welcome</text></svg>',
    ),
  )
    .png()
    .toBuffer();
  await file.setInputFiles({
    name: "poster.png",
    mimeType: "image/png",
    buffer: poster,
  });
  await page
    .getByRole("button", { name: "Retry image upload", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Submit for moderation", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "Retry image upload", exact: true })
    .click();
  await page
    .getByText("Check that the text is readable.", { exact: false })
    .waitFor();
  assert.equal(uploadCalls, 2);
  assert.equal(await d.noticeImages.countDocuments(), 1);
  const image = await d.noticeImages.findOne({});
  assert.ok(image);
  await page.locator("[name=title]").fill("Community lesson");
  await page
    .locator("[name=body]")
    .fill("Join the community lesson at the mosque after prayer.");
  const local = (time: number) =>
    new Date(time + 5 * 3600000).toISOString().slice(0, 16);
  await page.locator("[name=event]").fill(local(Date.now() + 3600000));
  await page.locator("[name=expires]").fill(local(Date.now() + 7200000));
  await page
    .locator("[name=source]")
    .fill("Authorized mosque committee confirmed all details.");
  await page.screenshot({
    path: "docs/notice-image-form-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Submit for moderation", exact: true })
    .click();
  await page.waitForURL("**/manage/notices");
  const notice = await d.notices.findOne({ imageId: image._id });
  assert.ok(notice);
  assert.equal(
    (
      await visitor.request.get(
        c.WEB_ORIGIN + "/api/v1/notices/" + notice._id + "/image",
      )
    ).status(),
    404,
  );
  await login(review, "+12025550102");
  await review.goto(c.WEB_ORIGIN + "/manage/notices");
  const approve = review.getByRole("button", {
    name: "Approve notice",
    exact: true,
  });
  assert.equal(await approve.isDisabled(), true);
  const checked = review.getByRole("checkbox", {
    name: /I checked the poster/,
  });
  await checked.check();
  await review.screenshot({
    path: "docs/notice-image-review-desktop.png",
    fullPage: true,
  });
  await approve.click();
  await review
    .getByRole("button", { name: "Approve notice", exact: true })
    .waitFor({ state: "detached" });
  assert.equal(
    (await d.notices.findOne({ _id: notice._id }))?.state,
    "Published",
  );
  await visitor.goto(c.WEB_ORIGIN + "/notice/" + notice._id);
  await visitor.locator(".notice-image").waitFor();
  await visitor.waitForFunction(
    () =>
      !!document.querySelector<HTMLImageElement>(".notice-image")?.naturalWidth,
  );
  await visitor.screenshot({
    path: "docs/notice-image-public-mobile.png",
    fullPage: true,
  });
  await visitor.getByRole("button", { name: "اردو", exact: true }).click();
  assert.equal(await visitor.locator("html").getAttribute("dir"), "rtl");
  assert.equal(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await visitor.goto(c.WEB_ORIGIN + "/notices?venue=" + venue._id);
  await visitor.locator(".notice-image.thumbnail").waitFor();
  await go(c.WEB_ORIGIN + "/manage/notices/" + notice._id + "/edit");
  await page.locator(".notice-image").waitFor();
  assert.ok(await page.locator("[name=event]").inputValue());
  await page.locator("[name=title]").fill("Revised community lesson");
  await page
    .getByRole("button", { name: "Submit for moderation", exact: true })
    .click();
  await page.waitForURL("**/manage/notices");
  const revision = await d.notices.findOne({ replacesId: notice._id });
  assert.equal(revision?.imageId, image._id);
  await go(c.WEB_ORIGIN + "/manage/notices/" + revision!._id + "/edit");
  await page
    .getByRole("button", {
      name: "Remove image / continue with text only",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Submit for moderation", exact: true })
    .click();
  await page.waitForURL("**/manage/notices");
  assert.equal(
    (await d.notices.findOne({ replacesId: revision!._id }))?.imageId,
    undefined,
  );
  await go(c.WEB_ORIGIN + "/manage/notices/new?venue=" + venue._id);
  await file.setInputFiles({
    name: "poster.png",
    mimeType: "image/png",
    buffer: poster,
  });
  await page
    .getByText("Check that the text is readable.", { exact: false })
    .waitFor();
  await page.locator("[name=venue]").selectOption(second._id);
  assert.equal(await page.locator(".notice-image").count(), 0);
  await d.notices.updateMany(
    { imageId: image._id },
    { $set: { expires: new Date(0).toISOString() } },
  );
  await d.noticeImages.updateOne(
    { _id: image._id },
    { $set: { deleteAfter: new Date(0) } },
  );
  assert.equal(
    (
      await visitor.request.get(
        c.WEB_ORIGIN + "/api/v1/notices/" + notice._id + "/image",
      )
    ).status(),
    404,
  );
  await cleanNoticeImages(d, storage);
  assert.equal(assets.has(image.publicId), false);
  await visitor.goto(c.WEB_ORIGIN + "/notice/" + notice._id);
  assert.equal(await visitor.locator(".notice-image").count(), 0);
  assert.deepEqual(errors, []);
  console.info(
    "PASS: mobile upload validation, retry, submission, private pending image, focal review, public/Urdu display, revision retention/removal, mosque switch and expiry cleanup.",
  );
} finally {
  await browser?.close();
  vite?.kill();
  if (server)
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  await client.close();
  await mongo.stop();
}
