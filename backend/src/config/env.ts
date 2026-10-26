import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1),
  DB_NAME: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default("discoversalah"),
  WEB_ORIGIN: z.string().url(),
  DATA_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
  TOKEN_KEY: z.string().regex(/^[a-f0-9]{64}$/i),
  SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
  PHONE_PROVIDER: z.enum(["disabled", "gateway"]).default("disabled"),
  PHONE_PROVIDER_URL: z.string().default(""),
  PHONE_PROVIDER_TOKEN: z.string().default(""),
});
export type Config = z.infer<typeof schema>;
export function config(input: NodeJS.ProcessEnv = process.env): Config {
  const c = schema.parse(input);
  if (c.NODE_ENV === "production" && !c.WEB_ORIGIN.startsWith("https://"))
    throw Error("Production requires HTTPS");
  if (c.DATA_KEY === c.TOKEN_KEY)
    throw Error("Use independent encryption and token keys");
  return c;
}
