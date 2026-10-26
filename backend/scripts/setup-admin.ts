import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import * as OTPAuth from "otpauth";
import { config } from "../src/config/env.js";
import { connect } from "../src/db/database.js";
import { phone, text } from "../src/lib/validation.js";
const args = process.argv.slice(2);
function arg(key: string) {
  return args[args.indexOf(key) + 1];
}
try {
  const number = phone.parse(arg("--phone")),
    name = text.parse(arg("--name"));
  const d = await connect(config());
  try {
    if (await d.accounts.countDocuments({ role: "admin" }))
      throw Error("Administrator already exists");
  } finally {
    await d.client.close();
  }
  const pass = randomBytes(24).toString("base64url"),
    secret = new OTPAuth.Secret({ size: 20 }).base32;
  const codes = Array.from({ length: 8 }, () =>
    randomBytes(24).toString("base64url"),
  );
  const file = new URL("../.local-admin-setup.txt", import.meta.url);
  await writeFile(
    file,
    [
      "DiscoverSalah initial administrator - PRIVATE",
      "Name: " + name,
      "Contact: " + number,
      "Temporary password: " + pass,
      "Authenticator: SHA1, 6 digits, 30 seconds",
      "TOTP secret: " + secret,
      "Recovery codes (each usable once):",
      ...codes,
      "",
      "Import the secret into your authenticator. Sign in and change the temporary password.",
      "Move recovery codes to your private password manager, then delete this file.",
    ].join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  Object.assign(process.env, {
    BOOTSTRAP_PHONE: number,
    BOOTSTRAP_NAME: name,
    BOOTSTRAP_PASSWORD: pass,
    BOOTSTRAP_TOTP_SECRET: secret,
    BOOTSTRAP_RECOVERY_CODES: codes.join(","),
    BOOTSTRAP_IDENTITY_CONFIRMED: "yes",
    BOOTSTRAP_TEMPORARY: "yes",
  });
  await import("./bootstrap.js");
  console.info(
    "Private setup details saved in backend/.local-admin-setup.txt. No password or MFA secret was printed.",
  );
} catch (error) {
  console.error(
    "Administrator setup did not finish. Existing accounts and setup files are never overwritten. Check local configuration; sensitive error details are suppressed.",
  );
  process.exitCode = 1;
}
