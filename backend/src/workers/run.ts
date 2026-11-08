import { setTimeout } from "node:timers/promises";
import { config } from "../config/env.js";
import { connect } from "../db/database.js";
import { deliverOne } from "./outbox.js";
import { retainOneBatch } from "./retention.js";
import { cleanNoticeImages } from "./notice-images.js";
import { CloudinaryImages } from "../providers/images.js";
const settings = config();
const d = await connect(settings);
const images = new CloudinaryImages(settings);
let running = true;
let nextRetention = 0;
let nextImageCleanup = 0;
process.on("SIGTERM", () => {
  running = false;
});
process.on("SIGINT", () => {
  running = false;
});
try {
  while (running) {
    try {
      if (Date.now() >= nextImageCleanup) {
        const count = await cleanNoticeImages(d, images);
        nextImageCleanup = Date.now() + (count === 50 ? 1000 : 60000);
      }
      if (Date.now() >= nextRetention) {
        const count = await retainOneBatch(d);
        nextRetention = Date.now() + (count === 100 ? 1000 : 3600000);
      }
      if (!(await deliverOne(d))) await setTimeout(1000);
    } catch {
      console.error(JSON.stringify({ event: "worker_cycle_failed" }));
      await setTimeout(3000);
    }
  }
} finally {
  await d.client.close();
}
