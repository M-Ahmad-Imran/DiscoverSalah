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
  // Optional until configured; text notices continue to work without image storage.
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .regex(/^[a-zA-Z0-9_-]*$/)
    .optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});
export type Config = z.infer<typeof schema>;
// Background maintenance never needs the API's encryption or session secrets.
export function workerConfig(input: NodeJS.ProcessEnv = process.env) {
  const c = schema
    .pick({
      MONGODB_URI: true,
      DB_NAME: true,
      CLOUDINARY_CLOUD_NAME: true,
      CLOUDINARY_API_KEY: true,
      CLOUDINARY_API_SECRET: true,
    })
    .parse(input);
  const keys = [
    c.CLOUDINARY_CLOUD_NAME,
    c.CLOUDINARY_API_KEY,
    c.CLOUDINARY_API_SECRET,
  ];
  if (keys.some(Boolean) && !keys.every(Boolean))
    throw Error(
      "Set all three Cloudinary credentials, or leave all three empty.",
    );
  return c;
}
export function config(input: NodeJS.ProcessEnv = process.env): Config {
  const c = schema.parse(input);
  const mediaKeys = [
    c.CLOUDINARY_CLOUD_NAME,
    c.CLOUDINARY_API_KEY,
    c.CLOUDINARY_API_SECRET,
  ];
  if (mediaKeys.some(Boolean) && !mediaKeys.every(Boolean))
    throw Error(
      "Set all three Cloudinary credentials, or leave all three empty.",
    );
  if (c.NODE_ENV === "production" && !c.WEB_ORIGIN.startsWith("https://"))
    throw Error("Production requires HTTPS");
  if (c.DATA_KEY === c.TOKEN_KEY)
    throw Error("Use independent encryption and token keys");
  return c;
}
