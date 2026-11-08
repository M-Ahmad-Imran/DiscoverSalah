import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {readFile,writeFile,rename} from "node:fs/promises";
import {resolve} from "node:path";
import {config} from "../src/config/env.js";
import {connect} from "../src/db/database.js";
import {decrypt,digest,hashPassword,keyed,verifyPassword} from "../src/lib/crypto.js";
import {audit} from "../src/lib/commands.js";
import {phone} from "../src/lib/validation.js";

// Operator-only recovery for the account identified by the existing private setup file.
// Run from backend with --execute. No secrets are printed, even on failure.
let stage="configuration";
try {
  assert.ok(process.argv.includes("--execute"));
  const c=config(), file=resolve(".local-admin-setup.txt"), pending=resolve(".local-admin-reset.pending.txt");
  const previous=await readFile(file,"utf8");
  const contact=phone.parse(previous.match(/^Contact:\s*(.+)$/m)?.[1]?.trim());
  stage="database connection";
  const d=await connect(c);
  try {
    stage="account lookup";
    const account=await d.accounts.findOne({role:"admin",active:true,phoneHash:keyed(contact,c.TOKEN_KEY)});
    assert.ok(account?.mfaSecret);
    const password=randomBytes(24).toString("base64url"), passwordHash=await hashPassword(password);
    const expires=new Date(Date.now()+24*3600000);
    const validCodes=previous.split(/\r?\n/).map(line=>line.trim()).filter(line=>account.recoveryCodes?.includes(digest(line)));
    const text=["DiscoverSalah administrator - PRIVATE",`Name: ${account.name}`,`Contact: ${contact}`,`Temporary password: ${password}`,`Temporary password expires (Asia/Karachi): ${expires.toLocaleString("en-GB",{timeZone:"Asia/Karachi"})}`,"Authenticator: SHA1, 6 digits, 30 seconds",`TOTP secret: ${decrypt(account.mfaSecret,c.DATA_KEY)}`,"Recovery codes (remaining codes from previous setup file; each usable once):",...validCodes,"","Password reset only: existing MFA configuration and recovery codes are unchanged.","Sign in with the temporary password and current authenticator code, then choose a new password.","All previous sessions and pending authentication tokens have been revoked.","Store these credentials privately and remove this file after successful setup."].join("\n");
    stage="staging private credentials";
    await writeFile(pending,text,{flag:"wx",mode:0o600});
    const session=d.client.startSession();
    try {
      stage="password reset transaction";
      await session.withTransaction(async()=>{
        const result=await d.accounts.updateOne({_id:account._id,role:"admin",active:true,authVersion:account.authVersion,fence:account.fence},{$set:{passwordHash,mustChangePassword:true,temporaryPasswordExpiresAt:expires},$inc:{authVersion:1,fence:1}},{session});
        assert.equal(result.modifiedCount,1);
        await d.sessions.deleteMany({accountId:account._id},{session});
        await d.tokens.deleteMany({accountId:account._id},{session});
        await audit(d,session,"local-operator","Administrator password reset by local operator; MFA preserved; sessions revoked",account._id);
      });
    } finally {await session.endSession();}
    stage="publishing private credentials";
    await rename(pending,file);
    stage="verification";
    const updated=await d.accounts.findOne({_id:account._id});
    assert.ok(updated && await verifyPassword(password,updated.passwordHash || ""));
    assert.equal(updated.mfaSecret,account.mfaSecret);
    assert.deepEqual(updated.recoveryCodes,account.recoveryCodes);
    assert.equal(updated.authVersion,account.authVersion+1);
    assert.equal(await d.sessions.countDocuments({accountId:account._id}),0);
    assert.equal(await d.tokens.countDocuments({accountId:account._id}),0);
    assert.equal(await readFile(file,"utf8"),text);
    console.info(JSON.stringify({reset:true,credentialsFile:"backend/.local-admin-setup.txt",mfaPreserved:true,sessionsRevoked:true,verified:true,expiresAt:expires.toISOString()}));
  } finally {await d.client.close();}
} catch {
  console.error(JSON.stringify({resetConfirmed:false,stage,message:"Sensitive details suppressed. If a pending credentials file exists, reconcile it before retrying."}));
  process.exitCode=1;
}
