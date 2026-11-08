import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
import { config } from "../src/config/env.js";
import {
  CloudinaryImages,
  MAX_STORED_IMAGE_BYTES,
} from "../src/providers/images.js";
import type { NoticeImage } from "../src/db/models.js";

// Operator-only diagnostic: redact configuration, signatures and URLs from provider errors.
const retryId = process.argv[2];
if (retryId && !/^discoversalah\/notices\/smoke-[a-f0-9-]{36}$/.test(retryId))
  throw Error("Invalid smoke-test ID");
const publicId = retryId || `discoversalah/notices/smoke-${randomUUID()}`;
let storage: CloudinaryImages | undefined;
let attempted = false;
try {
  const settings = config();
  storage = new CloudinaryImages(settings, async (url, init) => {
    const response = await fetch(url, init);
    console.info(
      JSON.stringify({
        stage:
          init?.method === "POST"
            ? String(url).endsWith("/destroy")
              ? "delete"
              : "upload"
            : "read",
        httpStatus: response.status,
      }),
    );
    if (!response.ok) {
      const body = await response
        .clone()
        .json()
        .catch(() => ({}));
      const message = String(body?.error?.message || "");
      let safeMessage = message;
      const signature = init?.body instanceof FormData ? init.body.get("signature") : undefined;
      for (const value of [...Object.values(settings), signature]) {
        if (typeof value === "string" && value.length) safeMessage = safeMessage.split(value).join("[redacted]");
      }
      safeMessage = safeMessage.replace(/https?:\/\/\S+/gi,"[url]").replace(/[a-z0-9_-]{24,}/gi,"[token]").slice(0,400);
      console.info(JSON.stringify({providerMessage:safeMessage}));
      const allowed = new Set(
        "invalid unknown api key api_key cloud name cloud_name signature timestamp disabled account missing must supply not found authorized unauthorized enabled access denied mismatch credentials authentication required secret api_secret".split(
          " ",
        ),
      );
      console.info(
        JSON.stringify({
          errorKeywords: message
            .toLowerCase()
            .split(/[^a-z_]+/)
            .filter((word) => allowed.has(word)),
        }),
      );
    }
    return response;
  });
  assert.ok(storage.enabled);
  const input = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#15765b" },
  })
    .png()
    .toBuffer();
  attempted = true;
  const result = await storage.upload(publicId, input);
  assert.equal(result.width, 1600);
  assert.equal(result.height, 800);
  assert.ok(result.bytes <= MAX_STORED_IMAGE_BYTES);
  const bytes = await storage.read({
    publicId,
    storageCloud: storage.namespace,
    version: result.version,
  } as NoticeImage);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, result.width);
  assert.equal(metadata.height, result.height);
  assert.equal(bytes.length, result.bytes);
  console.info(
    JSON.stringify({
      uploadAndRead: true,
      inputBytes: input.length,
      storedBytes: bytes.length,
      width: metadata.width,
      height: metadata.height,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      passed: false,
      errorType: error instanceof Error ? error.name : "Unknown",
      code: (error as { code?: string })?.code || "CHECK_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  if (storage && attempted) {
    try {
      await storage.destroy(publicId);
      console.info(JSON.stringify({ temporaryAssetDeleted: true }));
    } catch {
      console.error(
        JSON.stringify({
          temporaryAssetDeleted: false,
          cleanupPublicId: publicId,
        }),
      );
      process.exitCode = 1;
    }
  }
}
