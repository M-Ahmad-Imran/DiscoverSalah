import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

// Exclusive creation protects existing credentials from accidental regeneration.
const example = await readFile(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
await writeFile(
  new URL("../.env", import.meta.url),
  example
    .replace(/^DATA_KEY=$/m, "DATA_KEY=" + randomBytes(32).toString("hex"))
    .replace(/^TOKEN_KEY=$/m, "TOKEN_KEY=" + randomBytes(32).toString("hex")),
  { flag: "wx", mode: 0o600 },
);
console.info(
  "Created backend/.env with independent local keys. Keep this file private.",
);
