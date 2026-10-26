import type { Config } from "../config/env.js";
import { ApiError } from "../lib/errors.js";
export interface PhoneProvider {
  start(number: string, purpose: "invite" | "recovery"): Promise<string>;
  verify(reference: string, code: string): Promise<boolean>;
}
export class DisabledPhoneProvider implements PhoneProvider {
  async start(): Promise<string> {
    throw new ApiError(
      503,
      "PHONE_PROVIDER_UNAVAILABLE",
      "Contact-number verification is not configured.",
    );
  }
  async verify(): Promise<boolean> {
    throw new ApiError(
      503,
      "PHONE_PROVIDER_UNAVAILABLE",
      "Contact-number verification is not configured.",
    );
  }
}
/** Gateway contract is provider-neutral. No phone/code values enter application logs. */
export class GatewayPhoneProvider implements PhoneProvider {
  constructor(private c: Config) {
    if (!c.PHONE_PROVIDER_URL.startsWith("https://") || !c.PHONE_PROVIDER_TOKEN)
      throw Error("Phone gateway requires HTTPS and a credential");
  }
  private async request(path: string, body: unknown) {
    try {
      const response = await fetch(
        this.c.PHONE_PROVIDER_URL.replace(/\/$/, "") + path,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer " + this.c.PHONE_PROVIDER_TOKEN,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000),
          redirect: "error",
        },
      );
      if (!response.ok) throw Error();
      return (await response.json()) as Record<string, unknown>;
    } catch {
      throw new ApiError(
        503,
        "PHONE_PROVIDER_UNAVAILABLE",
        "Verification service is temporarily unavailable.",
      );
    }
  }
  async start(number: string, purpose: "invite" | "recovery") {
    const result = await this.request("/challenges", { number, purpose });
    if (typeof result.reference !== "string" || result.reference.length > 200)
      throw new ApiError(
        503,
        "PHONE_PROVIDER_UNAVAILABLE",
        "Invalid provider response.",
      );
    return result.reference;
  }
  async verify(reference: string, code: string) {
    return (
      (await this.request("/challenges/verify", { reference, code }))
        .verified === true
    );
  }
}
