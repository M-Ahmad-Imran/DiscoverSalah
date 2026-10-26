import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
export const id = z.string().uuid();
export const text = z.string().trim().min(1).max(500);
export const phone = z
  .string()
  .max(30)
  .transform((v, ctx) => {
    const p = parsePhoneNumberFromString(v, "PK");
    if (!p?.isValid()) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid contact number with country code.",
      });
      return z.NEVER;
    }
    return p.number as string;
  });
export const password = z.string().min(12).max(128);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const prayers = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
  "Jumu’ah",
  "Eid",
] as const;
export const times = z
  .object({ Fajr: time, Dhuhr: time, Asr: time, Maghrib: time, Isha: time })
  .strict();
export const special = z
  .object({
    id: z.string().min(1).max(80),
    prayer: z.enum(prayers),
    date,
    time,
    khutbah: z.union([time, z.literal("")]),
    provisional: z.boolean(),
    canceled: z.boolean(),
  })
  .strict();
export const snapshot = z
  .object({
    times,
    special: z
      .array(special)
      .max(100)
      .refine(
        (a) => new Set(a.map((s) => s.id)).size === a.length,
        "Session IDs must be unique",
      ),
    effective: date,
    reason: text.min(5),
  })
  .strict();
export const submitSchema = snapshot.extend({
  baseRevision: z.number().int().nonnegative(),
});
export const evidence = z
  .object({
    outcome: z.enum([
      "Confirmed as submitted",
      "Details do not match",
      "No answer / unreachable",
      "Contact invalid / authority unclear",
      "Only some changes confirmed",
    ]),
    person: text,
    calledAt: z
      .string()
      .datetime({ offset: true })
      .refine(
        (v) => Date.parse(v) <= Date.now() + 60000,
        "Call cannot be in future",
      ),
    notes: text.min(5),
  })
  .strict();
export const decisionSchema = z
  .object({
    decision: z.enum(["Approved", "Returned", "Rejected"]),
    expectedVersion: z.number().int().positive(),
    expectedVenueRevision: z.number().int().nonnegative(),
    publicReason: text.min(5),
    evidence: evidence.optional(),
  })
  .strict();
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export const page = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});
