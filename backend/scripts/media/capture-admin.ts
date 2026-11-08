import sharp from "sharp";
import { compressNoticeImage, type ImageStorage } from "../../src/providers/images.js";
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
  PORT: 4173,
  MONGODB_URI: "",
  DB_NAME: "browser_tests",
  WEB_ORIGIN: "http://127.0.0.1:5179",
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
const images=new Map<string,Buffer>();
const storage:ImageStorage={enabled:true,namespace:'admin-training',async upload(id,input){const bytes=await compressNoticeImage(input);images.set(id,bytes);const m=await sharp(bytes).metadata();return {width:m.width!,height:m.height!,bytes:bytes.length,version:1};},async read(image){return images.get(image.publicId)!;},async destroy(id){images.delete(id);}};
const server = createApp(d, c,undefined,storage).listen(4173, "127.0.0.1");
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    
    "--host",
    "127.0.0.1",
    "--port",
    "5179",
    "--strictPort",
  ],
  {
    cwd: new URL("../../../frontend/", import.meta.url),
    env: { ...process.env, API_PROXY_TARGET: "http://127.0.0.1:4173" },
    windowsHide: true,
    stdio: "inherit",
  },
);
const fs=await import('node:fs/promises');
const out=new URL('../../../video/admin-assets/',import.meta.url);await fs.mkdir(out,{recursive:true});
const nextFriday=new Date();nextFriday.setUTCDate(nextFriday.getUTCDate()+((5-nextFriday.getUTCDay()+7)%7||7));
const future=nextFriday.toISOString().slice(0,10);
const pid=randomUUID(),regid=randomUUID(),cid=randomUUID(),prid=randomUUID(),rid=randomUUID(),sid=randomUUID();
await d.proposals.insertOne({_id:pid,venueId:venue._id,authorId:rep._id,version:1,baseRevision:0,state:'Submitted',before:venue.initial,snapshot:{...venue.initial,times:{...venue.initial.times,Asr:'16:45'},special:[{id:'training-friday',prayer:'Jumu’ah',date:future,time:'13:30',khutbah:'13:00',provisional:false,canceled:false}],effective:future,reason:'Training example: Imam confirmation required for Asr and Friday session.'},createdAt:new Date()});
await d.tasks.insertOne({_id:randomUUID(),venueId:venue._id,recordId:pid,kind:'Timetable',state:'Open',createdAt:new Date()});
await d.venues.insertOne({...venue,_id:regid,name:'New Training Mosque',status:'Draft',registrationState:'Submitted',registrationRelationship:'Authorized local representative'});
await d.contacts.insertOne({_id:randomUUID(),venueId:regid,nameCipher:encrypt('Example Imam',c.DATA_KEY),phoneCipher:encrypt('+12025550109',c.DATA_KEY),permission:true});
for(const [id,kind,content] of [[cid,'contact-change',{name:'New Example Imam',phone:'+12025550108',reference:'Existing registered mosque committee authority',consent:true,reason:'Training example: new authorized Imam'}],[prid,'profile-change',{name:'Training Mosque',address:'Example street, main entrance',facilities:{Wudu:'Available'},reason:'Training example: confirmed entrance address'}]] as const){
 await d.db.collection<Record<string,unknown> & {_id:string}>('venueChanges').insertOne({_id:id,venueId:venue._id,authorId:rep._id,kind,state:'Submitted',revision:0,contentCipher:encrypt(JSON.stringify({...content,kind}),c.DATA_KEY),createdAt:new Date()});
}
for(const [id,kind,title,values] of [[rid,'report','Please check Asr timing',{details:'Asr time needs confirmation with the Imam.',prayer:'Asr'}],[sid,'suggestion','Example mosque suggestion',{name:'Suggested Training Mosque',address:'Example neighbourhood',details:'Please check whether this mosque is already listed.'}]] as const){
 await d.requests.insertOne({_id:id,kind,title,areaId,venueId:venue._id,status:kind==='report'?'Open':'Submitted',privateCipher:encrypt(JSON.stringify(values),c.DATA_KEY),trackingHash:keyed(randomUUID(),c.TOKEN_KEY),trackingExpiresAt:new Date(Date.now()+86400000),createdAt:new Date()});
}
await d.notices.insertOne({_id:randomUUID(),venueId:venue._id,authorId:rep._id,title:'Training example: community lesson',body:'A short community lesson after Isha. Confirm details with the mosque.',category:'Religious event',event:future+'T20:00:00+05:00',expires:future+'T22:00:00+05:00',sourceCipher:encrypt('Training example: authorized mosque committee consent.',c.DATA_KEY),state:'Submitted',revision:0,createdAt:new Date()});
await d.notifications.insertOne({_id:randomUUID(),accountId:focal._id,title:'Training timetable awaiting review',href:'/manage/review/'+pid,read:false,createdAt:new Date()});
await d.outbox.insertOne({_id:randomUUID(),recipientId:focal._id,title:'Training review reminder',href:'/manage/reviews',state:'failed',attempts:3,availableAt:new Date(),lastError:'Training example: notification delivery interrupted',createdAt:new Date()});
await d.notifications.insertOne({_id:randomUUID(),accountId:admin._id,title:'Training: review area coverage',href:'/manage/areas',read:false,createdAt:new Date()});
const applicationId=randomUUID();await d.requests.insertOne({_id:applicationId,kind:'application',title:'Training volunteer application',areaId,status:'Submitted',privateCipher:encrypt(JSON.stringify({name:'Training applicant',phone:'+12025550118',details:'Training example: local mosque volunteer'}),c.DATA_KEY),trackingHash:keyed(randomUUID(),c.TOKEN_KEY),trackingExpiresAt:new Date(Date.now()+86400000),createdAt:new Date()});
let browser;
try{
 for(let i=0;i<90;i++){try{if((await fetch(c.WEB_ORIGIN)).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1150,height:650},reducedMotion:'reduce'});page.setDefaultTimeout(60000);
 page.on('dialog',(dialog:any)=>dialog.accept());
 const shots:any={};
 async function shot(name:string,selector?:string){
  await page.waitForTimeout(700);
  if(selector){await page.locator(selector).first().waitFor();await page.locator(selector).first().scrollIntoViewIfNeeded();}
  await page.waitForTimeout(400);
  shots[name]={box:selector?await page.locator(selector).first().boundingBox():null};
  await page.screenshot({path:new URL(name+'.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
  await fs.writeFile(new URL('shots.json',out),JSON.stringify(shots,null,2));console.log('Captured',name);
 }
 async function go(path:string,name:string,selector?:string){for(let retry=0;retry<3;retry++){try{await page.goto(c.WEB_ORIGIN+path,{waitUntil:'domcontentloaded',timeout:120000});break;}catch(e){if(retry===2)throw e;await page.waitForTimeout(1500);}}await page.locator('main').waitFor();await page.waitForTimeout(1800);await shot(name,selector);}
 await go('/sign-in','signin','form');
 await page.locator('[name="contactNumber"]').fill('+12025550104');await page.locator('[name="password"]').fill(pass);await shot('credentials','form');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/mfa');await shot('mfa','form');
 await page.locator('[name="code"]').fill(new OTPAuth.TOTP({secret}).generate());await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForURL('**/manage');await page.waitForTimeout(2000);await shot('dashboard');
 await go('/manage/areas','areas');await page.getByRole('button',{name:'Add area',exact:true}).click();
 await page.getByLabel('Area name',{exact:true}).fill('Model Town - Training');await page.getByLabel('City',{exact:true}).fill('Lahore');await shot('area-form','form');
 await page.getByRole('button',{name:'Add area with responsibility gap',exact:true}).click();await page.getByRole('heading',{name:'Model Town - Training',exact:true}).waitFor();await shot('area-created');
 const newArea=await d.areas.findOne({name:'Model Town - Training'});if(!newArea)throw Error('Area not saved');
 await go('/manage/accounts','accounts');await go('/manage/accounts/invite','focal-create','form');
 await page.locator('[name="name"]').fill('Aamir - Training Focal');await page.locator('[name="phone"]').fill('+12025550115');await page.locator('[name="area"]').selectOption(newArea._id);await page.locator('[name="reason"]').fill('Training example: identity and authority checked with mosque committee.');await page.getByRole('checkbox').check();await shot('focal-filled','form');
 await page.getByRole('button',{name:'Create credentials',exact:true}).click();await page.locator('.break-all strong').waitFor();await page.locator('.break-all strong').evaluate((el:any)=>el.textContent='TRAINING PASSWORD — EXAMPLE ONLY');await shot('focal-created','.break-all');
 const newFocal=await d.accounts.findOne({name:'Aamir - Training Focal'});if(!newFocal)throw Error('Focal not saved');
 await go('/manage/assignments?area='+encodeURIComponent(newArea.name),'focal-assignment');
 await page.getByRole('searchbox',{name:'Search available records',exact:true}).last().fill('Aamir');await page.waitForTimeout(2500);await page.getByLabel('Authorized assignee',{exact:true}).selectOption(newFocal._id);await page.getByLabel('Mandatory reason',{exact:true}).fill('Training example: responsible focal person for this area.');await page.getByRole('checkbox').check();await shot('focal-assign-filled','button:has-text("Commit assignment")');await page.getByRole('button',{name:'Commit assignment',exact:true}).click();await page.waitForTimeout(1500);
 for(let n=0;n<30 && (await d.areas.findOne({_id:newArea._id}))?.focalId!==newFocal._id;n++)await page.waitForTimeout(500);
 await shot('assignment-result');console.log((await page.locator('main').innerText()).slice(0,1800));
 if((await d.areas.findOne({_id:newArea._id}))?.focalId!==newFocal._id)throw Error('Assignment not persisted');
 await go('/manage/areas','area-assigned');
 await go('/manage/register','register');await page.getByLabel('Mosque name',{exact:true}).fill('Masjid Rahmat - Training');await page.getByLabel('Area',{exact:true}).selectOption('Test area');await shot('register-basic','form');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Street address / entrance instructions',{exact:true}).fill('Training Street, main gate beside the park');await page.getByLabel('Entrance latitude',{exact:true}).fill('31.501');await page.getByLabel('Entrance longitude',{exact:true}).fill('74.301');await shot('register-location','input[type="number"]');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Registered Imam name',{exact:true}).fill('Training Imam');await page.getByLabel('Verification phone',{exact:true}).fill('+12025550116');await page.getByLabel('Representative relationship to mosque',{exact:true}).fill('Authorized mosque committee contact - training');await page.getByRole('checkbox').check();await shot('register-contact','form');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Wudu area',{exact:true}).selectOption('Available');await shot('register-times','form');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('checkbox').check();await shot('register-check','button:has-text("Submit registration")');await page.getByRole('button',{name:'Submit registration for verification',exact:true}).click();await page.waitForURL('**/manage/mosques/*');await shot('registered');
 await go('/manage/mosques','mosques');await go('/manage/mosques/'+venue._id,'mosque');
 await go('/manage/reviews','queue');
 await go('/manage/review/'+pid,'comparison');
 await shot('special','h3:has-text("Dated and special")');
 await shot('authority','a[href^="tel:"]');
 await shot('outcomes','input[type="radio"]');
 await page.getByLabel('No answer / unreachable',{exact:true}).check();
 await page.getByLabel('Person spoken to',{exact:true}).fill('No answer - training example');
 const called=new Date(Date.now()+5*3600000-5*60000).toISOString().slice(0,16);
 await page.getByLabel('Call date & time (PKT)').fill(called);
 await page.getByLabel('Private verification notes').fill('Training example only: call unanswered. No timings verified.');
 await shot('attempt-notes','textarea');
 await shot('attempt','button:has-text("Record attempt")');
 await page.getByRole('button',{name:'Record attempt · keep pending',exact:true}).click();
 await page.getByLabel('Message to representative / decision reason').fill('Please confirm the proposed Asr time and the dated Friday session.');
 await shot('return','button:has-text("Return for correction")');
 await page.getByRole('button',{name:'Return for correction',exact:true}).click();await shot('return-confirm','button:has-text("Confirm decision")');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await shot('reject','button:has-text("Reject submission")');
 await page.getByLabel('Confirmed as submitted',{exact:true}).check();
 await page.getByLabel('Person spoken to',{exact:true}).fill('Example registered Imam');
 await page.getByLabel('Private verification notes').fill('Training example only: Asr 16:45, Friday Jamaat 13:30, Khutbah 13:00 and effective date checked against version 1.');
 await page.waitForTimeout(3500);await shot('evidence','input[type="datetime-local"]');
 await page.getByRole('checkbox').check();
 await page.getByLabel('Message to representative / decision reason').fill('Training example: all changed times and the effective date confirmed.');
 await shot('check','input[type="checkbox"]');
 await shot('approve','button:has-text("Approve verified timings")');
 await page.getByRole('button',{name:'Approve verified timings',exact:true}).click();await shot('confirm','button:has-text("Confirm decision")');
 await page.getByRole('button',{name:'Confirm decision',exact:true}).click();await page.waitForURL('**/manage/submissions/*');await shot('approved');
 if((await d.proposals.findOne({_id:pid}))?.state!=='Approved')throw Error('Approval did not persist');
 await go('/manage/submissions','submissions');
 await go('/manage/registrations','registrations');await go('/manage/requests/'+regid,'registration-detail');
 await page.getByLabel('Disposition',{exact:true}).selectOption('Approved');
 await shot('registration-authority','input[type="datetime-local"]');
 await shot('registration-checks','input[type="checkbox"]');
 await shot('registration-save','button:has-text("Save review")');
 await go('/manage/contact-changes','contacts');await go('/manage/requests/'+cid,'contact-detail');
 await page.getByLabel('Disposition',{exact:true}).selectOption('Approved');await shot('contact-review','input[type="datetime-local"]');
 await go('/manage/profile-changes','profiles');await go('/manage/requests/'+prid,'profile-detail');
 await go('/manage/reports','reports');await go('/manage/requests/'+rid,'report-detail');
 await shot('dispute','button:has-text("Mark selected scope disputed")');
 await page.getByLabel('Disposition',{exact:true}).selectOption('In review');
 await page.getByLabel('Private investigation notes / decision reason').fill('Training example: checking the report with the registered Imam.');
 await page.getByLabel('Public response for the request owner').fill('Thank you. Your timing report is being checked.');
 await shot('report-decision','button:has-text("Save review")');
 await go('/manage/suggestions','suggestions');await go('/manage/requests/'+sid,'suggestion-detail');
 await go('/manage/notices','notices');await shot('notice-review','button:has-text("Approve notice")');
 await page.getByRole('button',{name:'Approve notice',exact:true}).click();await page.waitForTimeout(700);await shot('notice-published');
 await go('/manage/notices/new','notice-create','[name="title"]');
 await page.locator('[name="title"]').fill('Community lesson - Training');await page.locator('[name="body"]').fill('A community lesson after Isha. Please confirm details with the mosque. Training example only.');await page.locator('[name="event"]').fill(future+'T20:00');await page.locator('[name="expires"]').fill(future+'T22:00');await page.locator('[name="source"]').fill('Training example: permission from the authorized mosque committee.');await shot('notice-create','[name="title"]');
 const poster=await sharp(Buffer.from('<svg width="700" height="420"><rect width="700" height="420" fill="#126b50"/><text x="350" y="110" text-anchor="middle" fill="white" font-size="30">DISCOVERSALAH</text><text x="350" y="200" text-anchor="middle" fill="white" font-size="35">COMMUNITY LESSON</text><text x="350" y="270" text-anchor="middle" fill="#f4c76b" font-size="28">AFTER ISHA</text><text x="350" y="350" text-anchor="middle" fill="white" font-size="20">TRAINING EXAMPLE ONLY</text></svg>')).png().toBuffer();await page.locator('input[type="file"]').setInputFiles({name:'training-poster.png',mimeType:'image/png',buffer:poster});await page.getByRole('button',{name:'Remove image / continue with text only',exact:true}).waitFor();await shot('notice-image','.notice-image-picker');await shot('notice-submit','button[value="submit"]');
 await go('/manage/maintenance','maintenance');
 // Leave a second independent proposal pending so escalation demonstrates a real selectable task.
 const p2=randomUUID();await d.proposals.insertOne({_id:p2,venueId:venue._id,authorId:rep._id,version:2,baseRevision:1,state:'Submitted',before:venue.initial,snapshot:{...venue.initial,times:{...venue.initial.times,Isha:'19:30'},effective:future,reason:'Training example: Isha update awaiting verification'},createdAt:new Date()});
 await go('/manage/escalations','urgent');await page.getByLabel('Submission',{exact:true}).selectOption(p2);await page.getByLabel('Reason and urgency').fill('Training example: review needed before the new timetable starts.');await shot('escalate','button:has-text("Record escalation")');
 await go('/manage/representatives','representatives');
 await go('/manage/accounts/'+focal._id,'focal-account');await shot('reset-focal','button:has-text("Issue temporary password")');
 await go('/manage/assignments','assignment');await page.getByLabel('Authorized assignee',{exact:true}).selectOption(rep._id);await page.getByLabel('Mandatory reason',{exact:true}).fill('Training example: confirm responsible local representative.');await page.getByRole('checkbox').check();await shot('rep-assignment','button:has-text("Commit assignment")');
 await page.getByLabel('Operation',{exact:true}).selectOption('backup');await page.getByLabel('Authorized assignee',{exact:true}).selectOption(newFocal._id);await page.getByLabel('Starts at (Pakistan time)',{exact:true}).fill(future+'T08:00');await page.getByLabel('Ends at (Pakistan time)',{exact:true}).fill(future+'T18:00');await shot('backup','input[type="datetime-local"]');
 await go('/manage/applications','applications');await go('/manage/requests/'+applicationId,'application-detail');await go('/manage/duplicates','duplicates');await page.getByLabel('Assessment and evidence',{exact:true}).fill('Training example: compare mosque names, entrance location and committee confirmation.');await shot('duplicate-assessment','button:has-text("Record assessment")');
 await go('/manage/delivery','delivery');await go('/manage/history','history');await go('/manage/notifications','notifications');await go('/manage/account','account');await shot('password','input[type="password"]');await go('/recovery','recovery');await go('/reset-password','reset','form');
 // Separate focal-person session: this is the authorized issuer for local representatives.
 await page.context().clearCookies();await go('/sign-in','focal-signin');await page.locator('[name="contactNumber"]').fill('+12025550102');await page.locator('[name="password"]').fill(pass);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/manage');
 await go('/manage/accounts/invite','rep-create','form');await page.locator('[name="name"]').fill('Bilal - Training Representative');await page.locator('[name="phone"]').fill('+12025550117');await page.locator('[name="area"]').selectOption(areaId);await page.locator('[name="reason"]').fill('Training example: mosque committee authority independently checked.');await page.getByRole('checkbox').check();await shot('rep-filled','form');await page.getByRole('button',{name:'Create credentials',exact:true}).click();await page.locator('.break-all strong').waitFor();await page.locator('.break-all strong').evaluate((el:any)=>el.textContent='TRAINING PASSWORD — EXAMPLE ONLY');await shot('rep-created','.break-all');
 await fs.writeFile(new URL('capture-complete.json',out),JSON.stringify({screens:Object.keys(shots).length,areaCreated:true,focalCreated:true,focalAssigned:true,mosqueSubmitted:true,representativeCreated:true,approvalPersisted:true}));
}finally{await browser?.close();server.close();vite.kill();await client.close();await mongo.stop();}
