import { randomUUID } from "node:crypto";
import type { Database } from "../db/database.js";
import type { ImageStorage } from "../providers/images.js";

/** No TTL index: deletion metadata must survive provider failures and process crashes. */
export async function cleanNoticeImages(
  d: Database,
  storage: ImageStorage,
  limit = 50,
  onFailure = () => {},
) {
  if (!storage.enabled) return 0;
  let count = 0;
  while (count < limit) {
    const token = randomUUID();
    const image = await d.noticeImages.findOneAndUpdate(
      {
        storageCloud: storage.namespace,
        state: { $in: ["ready", "uploading", "deleting"] },
        deleteAfter: { $lte: new Date() },
        leaseUntil: { $lte: new Date() },
      },
      {
        $set: {
          state: "deleting",
          leaseToken: token,
          leaseUntil: new Date(Date.now() + 300000),
        },
        $inc: { attempts: 1 },
      },
      { sort: { deleteAfter: 1 }, returnDocument: "after" },
    );
    if (!image) break;
    try {
      await storage.destroy(image.publicId);
      await d.noticeImages.updateOne(
        { _id: image._id, leaseToken: token },
        {
          $set: {
            state: "deleted",
            deletedAt: new Date(),
            leaseUntil: new Date(0),
          },
          $unset: { leaseToken: "" },
        },
      );
    } catch {
      onFailure();
      await d.noticeImages.updateOne(
        { _id: image._id, leaseToken: token },
        {
          $set: {
            leaseUntil: new Date(
              Date.now() +
                Math.min(3600000, 30000 * 2 ** Math.min(image.attempts, 7)),
            ),
          },
          $unset: { leaseToken: "" },
        },
      );
      console.error(
        JSON.stringify({
          event: "notice_image_cleanup_retry",
          imageId: image._id,
        }),
      );
    }
    count++;
  }
  return count;
}
