import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import * as OTPAuth from "otpauth";
import { Database, indexes } from "../../src/db/database.js";
import { createApp } from "../../src/app.js";
import type { Config } from "../../src/config/env.js";
import type { Account, Venue } from "../../src/db/models.js";
import { encrypt, hashPassword, keyed } from "../../src/lib/crypto.js";
import { today } from "../../src/lib/validation.js";
const { chromium } = createRequire(import.meta.url)(
  "../../../frontend/node_modules/playwright",
);
const pass = "a synthetic long password";
const secret = new OTPAuth.Secret({ size: 20 }).base32;
const c: Config = {
  NODE_ENV: "test",
  PORT: 4171,
  MONGODB_URI: "",
  DB_NAME: "browser_tests",
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
  _id: randomUUID(),
  name: "Training Mosque",
  urdu: "نمونہ",
  areaId,
  city: "Test city",
  address: "Example neighbourhood, Lahore",
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
const server = createApp(d, c).listen(4171, "127.0.0.1");
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    
    "--host",
    "127.0.0.1",
    "--port",
    "5177",
    "--strictPort",
  ],
  {
    cwd: new URL("../../../frontend/", import.meta.url),
    env: { ...process.env, API_PROXY_TARGET: "http://127.0.0.1:4171" },
    windowsHide: true,
    stdio: "inherit",
  },
);
let browser;
try {
  for(let i=0;i<90;i++){try{if((await fetch(c.WEB_ORIGIN)).ok)break;}catch{} await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1150,height:650},reducedMotion:'reduce'});
  page.setDefaultTimeout(60000);
  page.on('dialog', (dialog:any) => dialog.accept());
  const fs=await import('node:fs/promises');
  const out=new URL('../../../video/representative-assets/',import.meta.url);
  await fs.mkdir(out,{recursive:true});
  const shots:any={};
  async function shot(name:string,selector?:string){
    await page.waitForTimeout(400);
    const guide=page.getByRole('button',{name:'Dismiss guide',exact:true});
    if(await guide.isVisible())await guide.click();
    if(selector && await page.locator(selector).count())await page.locator(selector).first().scrollIntoViewIfNeeded();
    else selector=undefined;
    await page.waitForTimeout(250);
    shots[name]={box:selector?await page.locator(selector).first().boundingBox():null,url:page.url()};
    await page.screenshot({path:new URL(name+'.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
    await fs.writeFile(new URL('shots.json',out),JSON.stringify(shots,null,2));
    console.log('Captured',name);
  }
  async function go(path:string,name:string,selector?:string){await page.goto(c.WEB_ORIGIN+path,{waitUntil:"domcontentloaded",timeout:120000});await page.locator("main").waitFor();await page.waitForTimeout(1500);await shot(name,selector);}
  await go('/sign-in','signin','form');
  await page.locator('[name="contactNumber"]').fill('+12025550101');
  await page.locator('[name="password"]').fill(pass);
  await shot('credentials','form');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL('**/manage');await shot('dashboard');
  await go('/manage/mosques','mosques');
  const base='/manage/mosques/'+venue._id;
  await go(base,'overview');
  await page.getByRole('button',{name:'Confirm timings unchanged',exact:true}).click();
  await shot('unchanged','button:has-text("Confirm unchanged")');
  await go(base+'/edit','daily');
  await page.getByLabel('Asr proposed time').fill('16:45');await shot('asr','[aria-label="Asr proposed time"]');
  await page.getByLabel('Reason for change').fill('Imam sahib confirmed the new Asr congregation time.');
  await shot('reason','textarea');
  await page.getByRole('button',{name:'Review changes',exact:true}).click();await shot('review');
  await page.getByRole('checkbox').check();await shot('submit','button:has-text("Submit for verification")');
  await page.getByRole('button',{name:'Submit for verification',exact:true}).click();
  await page.waitForURL('**/manage/submissions/*');await shot('submitted');
  await go('/manage/submissions','submissions');
  await go(base+'/edit?tab=special','special');
  await page.getByRole('button',{name:'Add session',exact:true}).click();await shot('session');
  await shot('session-options','input[type="checkbox"]');
  await go(base+'/profile','profile');await shot('profile-reason','textarea');
  await go(base+'/contact','contact');await shot('contact-consent','input[type="checkbox"]');
  await go('/manage/notices','notices');
  await go('/manage/notices/new','notice-form');await shot('notice-evidence','textarea');
  await page.locator('button[type="submit"]').last().scrollIntoViewIfNeeded();await shot('notice-submit');
  await go('/manage/reports','reports');
  await go('/manage/history','history');
  await go('/manage/notifications','notifications');
  await go('/manage/account','account');await shot('password','input[type="password"]');
  await go('/reset-password','reset','form');
  await go('/manage/register','register');
  await page.getByLabel('Mosque name',{exact:true}).fill('Example Community Mosque');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await shot('register-location');
  await page.getByLabel('Street address / entrance instructions').fill('Example street, main entrance');
  await page.getByLabel('Entrance latitude').fill('31.5204');
  await page.getByLabel('Entrance longitude').fill('74.3587');
  await page.getByRole('button',{name:'Continue',exact:true}).click();await shot('register-imam');
  await page.getByLabel('Registered Imam name').fill('Example Imam');
  await page.getByLabel('Verification phone').fill('+12025550109');
  await page.getByLabel('Representative relationship to mosque').fill('Authorized mosque representative');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await shot('register-times');
  await page.getByRole('button',{name:'Continue',exact:true}).click();await shot('register-review');
  await go('/recovery','recovery');
  await fs.writeFile(new URL('shots.json',out),JSON.stringify(shots,null,2));
} finally {await browser?.close();server.close();vite.kill();await client.close();await mongo.stop();}
