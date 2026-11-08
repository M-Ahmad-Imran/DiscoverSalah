import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import * as OTPAuth from "otpauth";
import { Database, indexes } from "../src/db/database.js";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config/env.js";
import type { Account, Venue } from "../src/db/models.js";
import { encrypt, hashPassword, keyed } from "../src/lib/crypto.js";
import { today } from "../src/lib/validation.js";
const { chromium } = createRequire(import.meta.url)(
  "../../frontend/node_modules/playwright",
);
const pass = "a synthetic long password";
const secret = new OTPAuth.Secret({ size: 20 }).base32;
const c: Config = {
  NODE_ENV: "test",
  PORT: 4100,
  MONGODB_URI: "",
  DB_NAME: "browser_tests",
  WEB_ORIGIN: "http://127.0.0.1:5174",
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
const d = new Database(client, client.db("browser_tests"));
await indexes(d);
let rep: Account, focal: Account, admin: Account, venue: Venue;
const areaId = randomUUID();
const hashed = await hashPassword(pass);
function account(role: Account["role"], number: string): Account {
  return {
    _id: randomUUID(),
    name: "Synthetic " + role,
    role,
    areaIds: [areaId],
    active: true,
    phoneHash: keyed(number, c.TOKEN_KEY),
    phoneCipher: encrypt(number, c.DATA_KEY),
    passwordHash: hashed,
    contactVerifiedAt: new Date(),
    authVersion: 0,
    fence: 0,
    createdAt: new Date(),
    ...(role === "admin" ? { mfaSecret: encrypt(secret, c.DATA_KEY) } : {}),
  };
}
rep = account("representative", "+12025550101");
focal = account("focal", "+12025550102");
admin = account("admin", "+12025550104");
await d.accounts.insertMany([rep, focal, admin]);
await d.areas.insertOne({
  _id: areaId,
  name: "Test area",
  city: "Test city",
  focalId: focal._id,
  revision: 0,
});
venue = {
  identityApprovedAt: new Date(),
  _id: randomUUID(),
  name: "Synthetic Mosque",
  urdu: "نمونہ",
  areaId,
  city: "Test city",
  address: "Synthetic address",
  entrance: { type: "Point", coordinates: [74.3, 31.5] },
  kind: "Mosque",
  facilities: { Wudu: "Unknown" },
  status: "Published",
  repId: rep._id,
  focalId: focal._id,
  revision: 0,
  authorId: rep._id,
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
    reason: "Initial test",
  },
  createdAt: new Date(),
};
await d.venues.insertOne(venue);
await d.contacts.insertOne({
  _id: randomUUID(),
  venueId: venue._id,
  nameCipher: encrypt("Private Imam", c.DATA_KEY),
  phoneCipher: encrypt("+12025550103", c.DATA_KEY),
  permission: true,
  verifiedAt: new Date(),
});
const server = createApp(d, c).listen(4100, "127.0.0.1");
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "5174",
    "--strictPort",
  ],
  {
    cwd: new URL("../../frontend/", import.meta.url),
    env: { ...process.env, API_PROXY_TARGET: "http://127.0.0.1:4100" },
    windowsHide: true,
    stdio: "inherit",
  },
);
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(c.WEB_ORIGIN)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined });
    Object.defineProperty(window, "structuredClone", { value: undefined });
  });
  page.on(
    "dialog",
    (dialog: { accept(): Promise<void> }) => void dialog.accept(),
  );
  page.setDefaultTimeout(60000);
  const training = new URL("../../video/workflow-v2-assets/", import.meta.url);
  await mkdir(training, { recursive: true });
  const shot = async (name: string) => {
    await page.locator("main h1").first().waitFor();
    const dismiss = page.getByRole("button", {
      name: "Dismiss guide",
      exact: true,
    });
    if (await dismiss.isVisible()) await dismiss.click();
    await page.setViewportSize({ width: 1150, height: 800 });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.screenshot({
      path: new URL(name + ".png", training).pathname.replace(
        /^\/([A-Za-z]:)/,
        "$1",
      ),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
  };
  const errors: string[] = [];
  page.on("pageerror", (e: Error) => errors.push(e.message));
  async function signIn(number: string) {
    await page.goto(c.WEB_ORIGIN + "/sign-in", {
      waitUntil: "domcontentloaded",
    });
    await page.locator('[name="contactNumber"]').fill(number);
    await page.locator('[name="password"]').fill(pass);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  const googleRequests: string[] = [];
  // A cold gateway must show a helpful status and recover before API calls.
  let ready = false;
  await page.route("**/health/ready", async (route: any) => {
    if (!ready) await route.fulfill({ status: 503, body: "Starting" });
    else await route.continue();
  });
  await page.goto(c.WEB_ORIGIN + "/location", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("status")
    .filter({ hasText: "Connecting to the server" })
    .waitFor();
  ready = true;
  await page
    .getByRole("button", { name: "Use my current location", exact: true })
    .waitFor();
  await page.unroute("**/health/ready");
  await shot("public-discovery");
  await page.screenshot({
    path: "../.project-reference/location-mobile-en.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "اردو", exact: true }).click();
  await page
    .getByRole("button", { name: "مساجد دکھائیں", exact: true })
    .waitFor();
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
  )
    throw Error("Urdu location page overflows");
  await page.screenshot({
    path: "../.project-reference/location-mobile-ur.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "English", exact: true }).click();
  if ((await page.locator("details").getAttribute("open")) !== null)
    throw Error("Coordinates should be optional and collapsed");
  await page.getByLabel("City", { exact: true }).fill("Lahore");
  await page.getByRole("button", { name: "Show mosques", exact: true }).click();
  await page.waitForURL("**/results?*");
  if (new URL(page.url()).searchParams.get("scope") !== "city")
    throw Error("Manual city browsing failed");
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 31.5, longitude: 74.3 });
  await page.goto(c.WEB_ORIGIN + "/location?city=WrongCity");
  await page
    .getByRole("button", { name: "Use my current location", exact: true })
    .click();
  await page
    .getByLabel("Location label (optional)", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await page.waitForFunction(
    () =>
      (document.querySelector('input[type="number"]') as HTMLInputElement)
        ?.value !== "",
  );
  await page.getByRole("button", { name: "Show mosques", exact: true }).click();
  await page.waitForURL("**/results?*");
  const nearbyUrl = new URL(page.url());
  if (
    nearbyUrl.searchParams.has("city") ||
    nearbyUrl.searchParams.get("scope") !== "nearby"
  )
    throw Error("GPS must not retain a conflicting city");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (overflow) throw Error("Mobile results overflow");
  console.info("Cold start, manual city and GPS discovery passed at 390px.");
  page.on("request", (request: { url(): string }) => {
    if (/google\.com|googleapis\.com|gstatic\.com/.test(request.url()))
      googleRequests.push(request.url());
  });
  await page.goto(
    c.WEB_ORIGIN +
      "/mosque/" +
      venue._id +
      "/directions?date=2000-01-01&prayer=Eid",
  );
  const directionsLink = page.getByRole("link", {
    name: "Open Google Maps",
    exact: true,
  });
  await directionsLink.waitFor();
  let url = new URL(await directionsLink.getAttribute("href"));
  if (
    url.searchParams.get("destination") !== "31.5,74.3" ||
    url.searchParams.get("travelmode") !== "walking" ||
    url.searchParams.has("origin")
  )
    throw Error("Incorrect external entrance URL");
  await page.getByLabel("Travel mode").selectOption("motorcycle");
  url = new URL(await directionsLink.getAttribute("href"));
  if (url.searchParams.get("travelmode") !== "two-wheeler")
    throw Error("Motorcycle mode was not preserved");
  if ((await directionsLink.getAttribute("rel")) !== "noopener noreferrer")
    throw Error("Missing external-link protection");
  await page.getByRole("button", { name: "اردو", exact: true }).click();
  await page
    .getByRole("link", { name: "گوگل میپس کھولیں", exact: true })
    .waitFor();
  if ((await page.locator("html").getAttribute("dir")) !== "rtl")
    throw Error("Urdu direction not applied");
  await page.getByRole("button", { name: "English", exact: true }).click();
  if (googleRequests.length)
    throw Error("Google was contacted before a user navigation action");
  console.info(
    "External directions passed without a timetable session, in both languages, with no automatic Google requests.",
  );
  await signIn("+12025550101");
  await page.waitForURL("**/manage");
  const pagedVenues = Array.from({ length: 24 }, (_, i) => ({
    ...venue,
    _id: randomUUID(),
    name: `Browser page mosque ${i}`,
    urdu: `صفحے کی مسجد ${i}`,
  }));
  await d.venues.insertMany(pagedVenues);
  await page.getByRole("link", { name: "My mosques", exact: true }).click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.waitForURL("**/manage/mosques?cursor=*");
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Dismiss guide", exact: true })
    .click();
  await page.getByRole("button", { name: "First page", exact: true }).waitFor();
  await page.getByLabel("Search mosques").fill("Browser page mosque 23");
  await page
    .getByRole("heading", { name: "Browser page mosque 23", exact: true })
    .waitFor();
  if (new URL(page.url()).searchParams.has("cursor"))
    throw Error("Search did not reset the cursor");
  await page.getByRole("button", { name: "اردو", exact: true }).click();
  await page
    .getByRole("heading", { name: "صفحے کی مسجد 23", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "اگلا صفحہ", exact: true }).waitFor();
  await page.screenshot({
    path: "../.project-reference/urdu-pagination-mobile.png",
    fullPage: true,
  });
  if (await page.getByLabel("Filter status").count())
    throw Error("Status filter label remained in English");
  await page.getByRole("button", { name: "English", exact: true }).click();
  console.info(
    "Mobile pagination, reload, search beyond the first page and Urdu controls passed.",
  );
  await page.goto(c.WEB_ORIGIN + "/manage/mosques/" + venue._id + "/edit");
  await page
    .getByRole("button", { name: "Dismiss guide", exact: true })
    .click();
  await page.getByLabel("Asr proposed time").fill("16:45");
  await page
    .getByLabel("Reason for change")
    .fill("Synthetic browser verification of the timetable flow");
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/review-changes");
  await page.getByRole("button", { name: "Publish timetable", exact: true }).waitFor();
  await shot("publish-preview");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Publish timetable", exact: true })
    .click();
  await page.waitForURL("**/manage/submissions/*");
  const submitted = await d.proposals.findOne({
    venueId: venue._id,
    state: "Published",
  });
  if (!submitted) throw Error("Timetable submission did not persist");
  await shot("published");
  await page.goto(c.WEB_ORIGIN + "/manage/mosques/" + venue._id);
  await page
    .getByRole("button", { name: "Confirm timings unchanged", exact: true })
    .waitFor();
  await shot("confirmation");
  console.info(
    "Representative mobile editor and timetable submission persisted.",
  );
  const returnedId = randomUUID();
  await d.venues.insertOne({
    ...venue,
    _id: returnedId,
    name: "Returned browser mosque",
    status: "Draft",
    revision: 1,
    registrationState: "Returned",
    registrationRelationship: "Assigned mosque representative",
  });
  await d.contacts.insertOne({
    _id: randomUUID(),
    venueId: returnedId,
    nameCipher: encrypt("Original registered Imam", c.DATA_KEY),
    phoneCipher: encrypt("+12025550103", c.DATA_KEY),
    permission: true,
  });
  await d.db.collection("registrationDecisions").insertOne({
    venueId: returnedId,
    actorId: focal._id,
    decision: "Returned",
    reason: "Correct entrance and Asr timing",
    at: new Date(),
  });
  await d.tasks.insertOne({
    _id: randomUUID(),
    recordId: returnedId,
    venueId: returnedId,
    kind: "Registration",
    state: "Closed",
    createdAt: new Date(),
  });
  await page.goto(c.WEB_ORIGIN + "/manage/mosques/" + returnedId);
  await page
    .getByRole("button", { name: "Dismiss guide", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: "Correct and resubmit registration",
      exact: true,
    })
    .click();
  await page
    .getByText("Correct entrance and Asr timing", { exact: true })
    .waitFor();
  if (
    (await page.getByLabel("Mosque name", { exact: true }).inputValue()) !==
    "Returned browser mosque"
  )
    throw Error("Registration was not prefilled");
  await page
    .getByLabel("Mosque name", { exact: true })
    .fill("Corrected browser mosque");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Entrance latitude").fill("31.51");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  if (
    (await page.getByLabel("Registered Imam name").inputValue()) !==
    "Original registered Imam"
  )
    throw Error("Private contact was not prefilled");
  await page
    .getByLabel("Registered Imam name")
    .fill("Corrected registered Imam");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Asr Jama’at", { exact: true }).fill("16:35");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", {
      name: "Resubmit registration for verification",
      exact: true,
    })
    .click();
  await page.waitForURL("**/manage/mosques/" + returnedId);
  const corrected = await d.venues.findOne({ _id: returnedId });
  if (
    corrected?.registrationState !== "Submitted" ||
    corrected.status !== "Draft" ||
    corrected.revision !== 2 ||
    corrected.initial.times.Asr !== "16:35" ||
    corrected.entrance.coordinates[1] !== 31.51
  )
    throw Error("Combined registration corrections did not persist");
  console.info(
    "Returned-registration mobile editor prefilled and resubmitted corrections for fresh review.",
  );
  await page.context().clearCookies();
  await signIn("+12025550102");
  await page.waitForURL("**/manage");
  await d.venues.updateOne(
    { _id: venue._id },
    { $set: { reconfirmedAt: new Date(Date.now() - 15 * 86400000) } },
  );
  await page.goto(c.WEB_ORIGIN + "/manage/maintenance?freshness=overdue");
  await page
    .getByText("Record a call or visit", { exact: true })
    .first()
    .click();
  await shot("follow-up");
  await page
    .getByLabel("Private contact notes")
    .first()
    .fill("Called the imam; representative needs to confirm today's times");
  await page
    .getByRole("button", { name: "Save follow-up", exact: true })
    .first()
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Follow-up recorded" })
    .waitFor();
  if (
    !(await d.db
      .collection("timetableFollowUps")
      .findOne({ venueId: venue._id }))
  )
    throw Error("Follow-up missing");
  if (
    (await d.proposals.findOne({ _id: submitted._id }))?.state !== "Published"
  )
    throw Error("Direct publication changed");
  console.info(
    "Direct publishing and focal 14-day follow-up passed without approval.",
  );
  await page.goto(c.WEB_ORIGIN + "/manage/mosques/" + venue._id + "/edit");
  await page.getByLabel("Reason for change").fill("Confirmed correction with the imam by phone");
  await page.getByRole("button", { name: "Review changes", exact: true }).click();
  await page.waitForURL("**/review-changes");
  await page.getByRole("button", { name: "Publish timetable", exact: true }).waitFor();
  await shot("focal-correction");
  await page.goto(c.WEB_ORIGIN + "/manage/notices/new");
  const nextOptionsResponse = page.waitForResponse(
    (response: { url(): string; status(): number }) =>
      response.url().includes("/management/workspace?view=venues") &&
      response.url().includes("cursor=") &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: "More options", exact: true }).click();
  await page.getByRole("button", { name: "First page", exact: true }).waitFor();
  // Wait for the requested page, not the previous options still visible during loading.
  const options = (await (await nextOptionsResponse).json()).page
    .ids as string[];
  const chosen = options[options.length - 1];
  await page.getByLabel("Mosque", { exact: true }).selectOption(chosen);
  await page.getByRole("button", { name: "First page", exact: true }).click();
  await page
    .getByRole("button", { name: "More options", exact: true })
    .waitFor();
  if (
    (await page.getByLabel("Mosque", { exact: true }).inputValue()) !== chosen
  )
    throw Error("Selection lost when option page changed");
  await page
    .getByLabel("Search available records")
    .fill("Browser page mosque 23");
  await page
    .getByLabel("Mosque", { exact: true })
    .selectOption(pagedVenues[23]!._id);
  console.info(
    "Searchable form selector reached later records and retained its selection across pages.",
  );
  await page.goto(c.WEB_ORIGIN + "/manage/accounts/invite");
  await page.getByLabel("Full name").fill("Browser representative");
  await page.getByLabel("Contact number", { exact: true }).fill("+12025550109");
  await page.getByLabel("Assigned area").selectOption(focal.areaIds[0]);
  await page
    .getByLabel("Reason / reference checks")
    .fill("Synthetic reference checks completed");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create credentials", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I have handed over the credentials" })
    .waitFor();
  if (
    (await d.accounts.countDocuments({ name: "Browser representative" })) !== 1
  )
    throw Error("Credentials did not persist");
  console.info("Focal credential issuance persisted in isolated MongoDB.");
  await page.context().clearCookies();
  await signIn("+12025550104");
  await page.waitForURL("**/mfa");
  await page.locator('[name="code"]').fill(
    new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
    }).generate(),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/manage");
  await page.goto(c.WEB_ORIGIN + "/manage/areas");
  await page.getByRole("button", { name: "Add area", exact: true }).click();
  await page
    .getByLabel("Area name", { exact: true })
    .fill("Assignment regression area");
  await page.getByLabel("City", { exact: true }).fill("Test city");
  await page
    .getByRole("button", {
      name: "Add area with responsibility gap",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: "Assignment regression area", exact: true })
    .waitFor();
  const assignmentArea = await d.areas.findOne({
    name: "Assignment regression area",
  });
  if (!assignmentArea) throw Error("Assignment test area missing");
  await page.goto(c.WEB_ORIGIN + "/manage/accounts/invite");
  await page.getByLabel("Full name").fill("New assignment focal");
  await page.getByLabel("Contact number", { exact: true }).fill("+12025550119");
  await page.getByLabel("Assigned area").selectOption(assignmentArea._id);
  await page
    .getByLabel("Reason / reference checks")
    .fill("Synthetic authority independently checked");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create credentials", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I have handed over the credentials" })
    .waitFor();
  const assignmentFocal = await d.accounts.findOne({
    name: "New assignment focal",
  });
  const assignmentRep = await d.accounts.findOne({
    name: "Browser representative",
  });
  if (!assignmentFocal || !assignmentRep)
    throw Error("New assignment accounts missing");
  await page.goto(
    c.WEB_ORIGIN +
      "/manage/assignments?area=" +
      encodeURIComponent(assignmentArea.name),
  );
  await page
    .getByLabel("Authorized assignee", { exact: true })
    .selectOption(assignmentFocal._id);
  async function saveAfterRefresh() {
    await page
      .getByLabel("Mandatory reason", { exact: true })
      .fill("Synthetic assignment after background refresh");
    await page.getByRole("checkbox").check();
    const refreshed = page.waitForResponse(
      (r: any) =>
        r.url().includes("/management/workspace?") &&
        new URL(r.url()).searchParams.get("view") === "form" &&
        r.status() === 200,
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await refreshed;
    // Allow React to apply the smaller payload. No search, reselect or reload workaround.
    await page.waitForTimeout(300);
    const saved = page.waitForResponse(
      (r: any) =>
        r.url().endsWith("/management/assignments") &&
        r.request().method() === "POST",
      { timeout: 15000 },
    );
    await page
      .getByRole("button", { name: "Commit assignment", exact: true })
      .click({ timeout: 15000 });
    const response = await saved;
    if (response.status() !== 200)
      throw Error("Assignment save failed: " + response.status());
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>('form input[type="checkbox"]')
          ?.checked === false,
    );
  }
  await saveAfterRefresh();
  if (
    (await d.areas.findOne({ _id: assignmentArea._id }))?.focalId !==
    assignmentFocal._id
  )
    throw Error("New focal assignment failed after refresh");
  console.info("New focal assignment persisted after refresh.");
  await page
    .getByLabel("Operation", { exact: true })
    .selectOption("representative");
  // The fixture has more than one page of venues. Find the target normally
  // before selecting it; do not search/reselect after the forced refresh.
  await page
    .getByRole("searchbox", { name: "Search available records", exact: true })
    .first()
    .fill(venue.name);
  await page
    .getByLabel("Target mosque or area", { exact: true })
    .selectOption(venue._id);
  await page
    .getByLabel("Authorized assignee", { exact: true })
    .selectOption(assignmentRep._id);
  await saveAfterRefresh();
  if ((await d.venues.findOne({ _id: venue._id }))?.repId !== assignmentRep._id)
    throw Error("Representative assignment failed after refresh");
  console.info("Representative assignment persisted after refresh.");
  await page.getByLabel("Operation", { exact: true }).selectOption("backup");
  await page
    .getByLabel("Target mosque or area", { exact: true })
    .selectOption(venue._id);
  await page
    .getByLabel("Authorized assignee", { exact: true })
    .selectOption(assignmentFocal._id);
  const start = new Date(Date.now() + 5 * 3600000 + 3600000)
    .toISOString()
    .slice(0, 16);
  const end = new Date(Date.now() + 5 * 3600000 + 7200000)
    .toISOString()
    .slice(0, 16);
  await page
    .getByLabel("Starts at (Pakistan time)", { exact: true })
    .fill(start);
  await page.getByLabel("Ends at (Pakistan time)", { exact: true }).fill(end);
  await saveAfterRefresh();
  if (
    (await d.venues.findOne({ _id: venue._id }))?.backup?.reviewerId !==
    assignmentFocal._id
  )
    throw Error("Backup assignment failed after refresh");
  console.info(
    "New focal, representative and backup assignments survive background refresh without reselecting.",
  );
  await page.context().clearCookies();
  // The next login must use a new TOTP step; clear the synthetic fixture's replay marker.
  await d.accounts.updateOne(
    { _id: admin._id },
    { $unset: { mfaLastStep: "" } },
  );
  await d.accounts.updateOne(
    { _id: admin._id },
    {
      $set: {
        mustChangePassword: true,
        temporaryPasswordExpiresAt: new Date(Date.now() + 3600000),
      },
    },
  );
  await signIn("+12025550104");
  await page.waitForURL("**/mfa");
  await page.locator('[name="code"]').fill(
    new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
    }).generate(),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/reset-password");
  await page.locator('[name="current"]').fill(pass);
  await page
    .locator('[name="password"]')
    .fill("another synthetic private password");
  await page
    .locator('[name="confirm"]')
    .fill("another synthetic private password");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/sign-in");
  if ((await d.accounts.findOne({ _id: admin._id }))?.mustChangePassword)
    throw Error("First password change was not persisted");
  await page.goto(c.WEB_ORIGIN + "/recovery");
  await page
    .getByText("Administrators should contact the trusted server operator", {
      exact: false,
    })
    .waitFor();
  if (await page.locator("input[type=email]").count())
    throw Error("Removed email recovery form is still visible");
  if (errors.length) throw Error(errors.join("; "));
  console.info(
    "Admin MFA and mandatory first password change passed; no browser runtime errors.",
  );
} finally {
  await browser?.close();
  vite.kill();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await client.close();
  await mongo.stop();
}
