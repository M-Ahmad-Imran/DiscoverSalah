import express, { Router } from "express";
import { randomUUID, createHash } from "node:crypto";
import type { Database } from "../../db/database.js";
import type { Config } from "../../config/env.js";
import type { ImageStorage } from "../../providers/images.js";
import {
  imageFormat,
  MAX_IMAGE_BYTES,
  MAX_STORED_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
} from "../../providers/images.js";
import { assert } from "../../lib/errors.js";
import { id } from "../../lib/validation.js";
import { command, audit } from "../../lib/commands.js";
import { principal, rateLimit } from "../../middleware/security.js";
import { venueScope } from "../venues/routes.js";

export const noticeImageUrl = (noticeId: string, management = false) =>
  `/api/v1/${management ? "management/" : ""}notices/${noticeId}/image`;

export function noticeImageRoutes(
  d: Database,
  c: Config,
  storage: ImageStorage,
  management: boolean,
) {
  const r = Router();
  if (management) {
    r.get("/notice-images/config", (_req, res) =>
      res.json({
        enabled: storage.enabled,
        maxBytes: MAX_IMAGE_BYTES,
        maxStoredBytes: MAX_STORED_IMAGE_BYTES,
        maxDimension: MAX_IMAGE_DIMENSION,
        outputFormat: "webp",
        formats: ["jpg", "png", "webp"],
        maxImagesPerNotice: 1,
      }),
    );
    r.post(
      "/notice-images",
      rateLimit(
        d,
        c,
        "notice-image-upload",
        10,
        3600,
        (req) => principal(req)._id,
      ),
      express.raw({ type: "application/octet-stream", limit: MAX_IMAGE_BYTES }),
      async (req, res) => {
        const a = principal(req),
          venueId = id.parse(req.query.venueId);
        assert(
          storage.enabled,
          503,
          "IMAGE_STORAGE_DISABLED",
          "Notice image storage is not configured yet.",
        );
        assert(
          Buffer.isBuffer(req.body) && req.body.length && imageFormat(req.body),
          422,
          "INVALID_IMAGE",
          "Upload a JPG, PNG or WebP image.",
        );
        assert(
          await d.venues.findOne({ _id: venueId, ...venueScope(a) }),
          404,
          "NOT_FOUND",
          "Mosque not found.",
        );
        const saved = await command(
          d,
          a,
          req.get("idempotency-key"),
          "notice-image-upload",
          {
            venueId,
            hash: createHash("sha256").update(req.body).digest("hex"),
          },
          async (s, current) => {
            // Fence mosque assignment changes before reserving an upload.
            assert(
              await d.venues.findOneAndUpdate(
                { _id: venueId, ...venueScope(current) },
                { $inc: { writeFence: 1 } },
                { session: s },
              ),
              404,
              "NOT_FOUND",
              "Mosque not found.",
            );
            const imageId = randomUUID();
            await d.noticeImages.insertOne(
              {
                _id: imageId,
                venueId,
                ownerId: current._id,
                publicId: `discoversalah/notices/${imageId}`,
                storageCloud: storage.namespace,
                state: "uploading",
                createdAt: new Date(),
                deleteAfter: new Date(Date.now() + 3600000),
                leaseUntil: new Date(0),
                attempts: 0,
              },
              { session: s },
            );
            await audit(
              d,
              s,
              current._id,
              "Notice image upload reserved",
              imageId,
              venueId,
            );
            return { id: imageId };
          },
        );
        let image = await d.noticeImages.findOne({
          _id: saved.id,
          storageCloud: storage.namespace,
        });
        assert(
          image &&
            image.deleteAfter > new Date() &&
            ["ready", "uploading"].includes(image.state),
          409,
          "IMAGE_EXPIRED",
          "Upload expired. Start a new upload with a new idempotency key.",
        );
        if (image.state === "uploading") {
          const token = randomUUID();
          image = await d.noticeImages.findOneAndUpdate(
            {
              _id: saved.id,
              state: "uploading",
              deleteAfter: { $gt: new Date() },
              leaseUntil: { $lte: new Date() },
            },
            {
              $set: {
                leaseUntil: new Date(Date.now() + 120000),
                leaseToken: token,
              },
            },
            { returnDocument: "after" },
          );
          assert(
            image,
            409,
            "UPLOAD_IN_PROGRESS",
            "This upload is in progress. Retry the same request shortly.",
          );
          try {
            const result = await storage.upload(image.publicId, req.body);
            await d.noticeImages.updateOne(
              { _id: image._id, state: "uploading", leaseToken: token },
              {
                $set: { ...result, state: "ready", leaseUntil: new Date(0) },
                $unset: { leaseToken: "" },
              },
            );
          } catch (error) {
            await d.noticeImages.updateOne(
              { _id: image._id, state: "uploading", leaseToken: token },
              { $set: { leaseUntil: new Date(0) }, $unset: { leaseToken: "" } },
            );
            throw error;
          }
        }
        const ready = await d.noticeImages.findOne({
          _id: saved.id,
          state: "ready",
        });
        assert(
          ready,
          409,
          "IMAGE_UNAVAILABLE",
          "Image unavailable. Retry the upload.",
        );
        res
          .status(201)
          .json({
            id: ready._id,
            width: ready.width,
            height: ready.height,
            bytes: ready.bytes,
            format: "webp",
            previewUrl: `/api/v1/management/notice-images/${ready._id}`,
            attachBefore: ready.deleteAfter,
          });
      },
    );
    r.get("/notice-images/:id", async (req, res) => {
      const image = await d.noticeImages.findOne({
        _id: id.parse(req.params.id),
        state: "ready",
        deleteAfter: { $gt: new Date() },
      });
      const a = principal(req);
      assert(
        image &&
          (a.role !== "representative" || image.ownerId === a._id) &&
          (await d.venues.findOne({ _id: image.venueId, ...venueScope(a) })),
        404,
        "NOT_FOUND",
        "Image not found.",
      );
      res
        .type("webp")
        .set("Cache-Control", "private, no-store")
        .send(await storage.read(image));
    });
  }
  r.get("/notices/:id/image", async (req, res) => {
    const notice = await d.notices.findOne({
      _id: id.parse(req.params.id),
      ...(management
        ? {}
        : {
            state: "Published" as const,
            expires: { $gt: new Date().toISOString() },
          }),
    });
    assert(notice?.imageId, 404, "NOT_FOUND", "Notice image not found.");
    assert(
      await d.venues.findOne({
        _id: notice.venueId,
        ...(management
          ? venueScope(principal(req))
          : { status: { $in: ["Published", "Maintenance pending"] } }),
      }),
      404,
      "NOT_FOUND",
      "Notice image not found.",
    );
    const image = await d.noticeImages.findOne({
      _id: notice.imageId,
      venueId: notice.venueId,
      state: "ready",
      deleteAfter: { $gt: new Date() },
    });
    assert(image, 404, "NOT_FOUND", "Notice image expired or unavailable.");
    const bytes = await storage.read(image);
    // Recheck after network I/O so a cancellation/expiry during fetch does not leak a notice.
    if (!management)
      assert(
        await d.notices.findOne({
          _id: notice._id,
          state: "Published",
          expires: { $gt: new Date().toISOString() },
        }),
        404,
        "NOT_FOUND",
        "Notice is not active.",
      );
    res.type("webp").set("Cache-Control", "private, no-store").send(bytes);
  });
  return r;
}
