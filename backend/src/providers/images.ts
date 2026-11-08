import { createHash } from "node:crypto";
import { z } from "zod";
import sharp from "sharp";
import type { Config } from "../config/env.js";
import type { NoticeImage } from "../db/models.js";
import { assert, ApiError } from "../lib/errors.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
let processing = 0;
// Bound concurrent native decoding on small/free API hosts; do not queue file buffers.
export async function compressNoticeImage(data: Buffer): Promise<Buffer> {
  assert(
    data.length <= MAX_IMAGE_BYTES && imageFormat(data),
    422,
    "INVALID_IMAGE",
    "Upload a JPG, PNG or WebP image up to 5 MiB.",
  );
  assert(
    processing < 2,
    503,
    "IMAGE_PROCESSING_BUSY",
    "Image processing is busy. Please retry shortly.",
  );
  processing++;
  try {
    const input = sharp(data, {
      limitInputPixels: 24000000,
      failOn: "warning",
    });
    const metadata = await input.metadata();
    assert(
      ["jpeg", "png", "webp"].includes(metadata.format || "") &&
        (metadata.pages || 1) === 1,
      422,
      "INVALID_IMAGE",
      "Use a still JPG, PNG or WebP image.",
    );
    const output = await input
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 4 })
      .timeout({ seconds: 15 })
      .toBuffer();
    assert(
      output.length <= MAX_STORED_IMAGE_BYTES,
      422,
      "IMAGE_TOO_COMPLEX",
      "This image is too detailed. Crop unnecessary content or upload a simpler poster.",
    );
    return output;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      422,
      "INVALID_IMAGE",
      "Image could not be processed. Use a valid still image of at most 24 megapixels.",
    );
  } finally {
    processing--;
  }
}
export interface ImageStorage {
  readonly enabled: boolean;
  readonly namespace: string;
  upload(
    publicId: string,
    data: Buffer,
  ): Promise<{ width: number; height: number; bytes: number; version: number }>;
  read(image: NoticeImage): Promise<Buffer>;
  destroy(publicId: string): Promise<void>;
}
export function imageFormat(data: Buffer): string | undefined {
  if (
    data.length >= 12 &&
    data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  )
    return "jpg";
  if (
    data.length >= 24 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    data.length >= 16 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
}
// Cloudinary requires a sorted SHA digest, not HMAC. Secrets never leave the server.
export function uploadSignature(
  params: Record<string, string>,
  secret: string,
) {
  return createHash("sha256")
    .update(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + secret,
    )
    .digest("hex");
}
export class CloudinaryImages implements ImageStorage {
  readonly enabled: boolean;
  readonly namespace: string;
  constructor(
    private readonly c: Pick<Config, "CLOUDINARY_CLOUD_NAME" | "CLOUDINARY_API_KEY" | "CLOUDINARY_API_SECRET">,
    private readonly http: typeof fetch = fetch,
  ) {
    this.enabled = !!(
      c.CLOUDINARY_CLOUD_NAME &&
      c.CLOUDINARY_API_KEY &&
      c.CLOUDINARY_API_SECRET
    );
    this.namespace = c.CLOUDINARY_CLOUD_NAME || "";
  }
  private check() {
    assert(
      this.enabled,
      503,
      "IMAGE_STORAGE_DISABLED",
      "Notice image storage is not configured yet.",
    );
  }
  private async call(
    action: string,
    values: Record<string, string>,
    data?: Buffer,
  ) {
    this.check();
    const params = {
      ...values,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.set(key, value);
    form.set("api_key", this.c.CLOUDINARY_API_KEY!);
    form.set(
      "signature",
      uploadSignature(params, this.c.CLOUDINARY_API_SECRET!),
    );
    if (data)
      form.set(
        "file",
        new Blob([new Uint8Array(data)]),
        "notice." + imageFormat(data),
      );
    try {
      const response = await this.http(
        `https://api.cloudinary.com/v1_1/${this.namespace}/image/${action}`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(30000),
          redirect: "error",
        },
      );
      if (!response.ok) throw Error("storage request failed");
      return await response.json();
    } catch {
      throw new ApiError(
        502,
        "IMAGE_STORAGE_FAILED",
        "Image storage is temporarily unavailable. Please retry.",
      );
    }
  }
  async upload(publicId: string, data: Buffer) {
    this.check();
    const compressed = await compressNoticeImage(data);
    const result = z
      .object({
        public_id: z.literal(publicId),
        resource_type: z.literal("image"),
        type: z.literal("authenticated"),
        format: z.literal("webp"),
        width: z.number().int().min(1).max(1600),
        height: z.number().int().min(1).max(1600),
        bytes: z.number().int().min(1).max(MAX_STORED_IMAGE_BYTES),
        version: z.number().int().positive(),
      })
      .safeParse(
        await this.call(
          "upload",
          {
            public_id: publicId,
            type: "authenticated",
            overwrite: "false",
            backup: "false",
            // Re-encode on ingestion: only the resized WebP is stored, not an original poster.
            // Compression is local: no on-upload or on-delivery transformation requested.
          },
          compressed,
        ),
      );
    assert(
      result.success,
      502,
      "INVALID_IMAGE_RESPONSE",
      "The image could not be processed.",
    );
    return {
      width: result.data.width,
      height: result.data.height,
      bytes: result.data.bytes,
      version: result.data.version,
    };
  }
  async read(image: NoticeImage) {
    this.check();
    assert(
      image.storageCloud === this.namespace && image.version,
      404,
      "NOT_FOUND",
      "Image not found.",
    );
    const path = `v${image.version}/${image.publicId}.webp`;
    const signature = createHash("sha1")
      .update(path + this.c.CLOUDINARY_API_SECRET!)
      .digest("base64url")
      .slice(0, 8);
    try {
      const result = await this.http(
        `https://res.cloudinary.com/${this.namespace}/image/authenticated/s--${signature}--/${path}`,
        { signal: AbortSignal.timeout(15000), redirect: "error" },
      );
      if (
        !result.ok ||
        !result.headers.get("content-type")?.startsWith("image/webp")
      )
        throw Error("image unavailable");
      const chunks: Uint8Array[] = [];
      let total = 0;
      for await (const chunk of result.body!) {
        total += chunk.length;
        if (total > MAX_IMAGE_BYTES) throw Error("image too large");
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch {
      throw new ApiError(
        502,
        "IMAGE_STORAGE_FAILED",
        "Image unavailable. Please retry.",
      );
    }
  }
  async destroy(publicId: string) {
    const result = await this.call("destroy", {
      public_id: publicId,
      type: "authenticated",
      invalidate: "true",
    });
    assert(
      result?.result === "ok" || result?.result === "not found",
      502,
      "IMAGE_DELETE_FAILED",
      "Image cleanup will retry.",
    );
  }
}
