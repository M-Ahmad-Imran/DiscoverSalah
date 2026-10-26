import {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
  scrypt as rawScrypt,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
export const token = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const keyed = (value: string, key: string) =>
  createHmac("sha256", Buffer.from(key, "hex")).update(value).digest("hex");
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function scrypt(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    rawScrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (e, key) => (e ? reject(e) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    "scrypt$" + salt + "$" + (await scrypt(password, salt)).toString("hex")
  );
}
export async function verifyPassword(password: string, hash: string) {
  const [, salt, expected] = hash.split("$");
  if (!salt || !expected) return false;
  return equal((await scrypt(password, salt)).toString("hex"), expected);
}
export function encrypt(value: string, key: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  return [
    iv.toString("base64url"),
    c.update(value, "utf8", "base64url") + c.final("base64url"),
    c.getAuthTag().toString("base64url"),
  ].join(".");
}
export function decrypt(value: string, key: string) {
  const [iv, data, tag] = value.split(".");
  if (!iv || !data || !tag) throw Error("Invalid ciphertext");
  const d = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "base64url"),
  );
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return d.update(data, "base64url", "utf8") + d.final("utf8");
}
export function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + stable(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
