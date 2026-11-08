import { workerConfig } from "../src/config/env.js";
import { connect } from "../src/db/database.js";
import { CloudinaryImages } from "../src/providers/images.js";
import { deliverOne } from "../src/workers/outbox.js";
import { cleanNoticeImages } from "../src/workers/notice-images.js";
import { retainOneBatch } from "../src/workers/retention.js";
import { runScheduled } from "../src/workers/scheduled.js";

let stopped = false;
process.on("SIGTERM", () => {
  stopped = true;
});
process.on("SIGINT", () => {
  stopped = true;
});
try {
  const settings = workerConfig();
  const d = await connect(settings);
  try {
    const images = new CloudinaryImages(settings);
    let retries = 0;
    const failed = () => {
      retries++;
    };
    const result = await runScheduled(
      {
        notifications: async () =>
          Number(await deliverOne(d, new Date(), failed)),
        images: () => cleanNoticeImages(d, images, 1, failed),
        retention: () => retainOneBatch(d),
      },
      { stopped: () => stopped },
    );
    console.info(
      JSON.stringify({
        event: "scheduled_worker_finished",
        ...result,
        retries,
        imageCleanupEnabled: images.enabled,
      }),
    );
    if (result.failures || retries || stopped) process.exitCode = 1;
  } finally {
    await d.client.close();
  }
} catch {
  // Database/provider errors may contain credentials: do not dump them into Actions logs.
  console.error(
    JSON.stringify({
      event: "scheduled_worker_failed",
      hint: "Check secrets, Atlas network access and provider availability.",
    }),
  );
  process.exitCode = 1;
}
