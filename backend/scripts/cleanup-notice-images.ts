import { config } from "../src/config/env.js";
import { connect } from "../src/db/database.js";
import { CloudinaryImages } from "../src/providers/images.js";
import { cleanNoticeImages } from "../src/workers/notice-images.js";
const settings = config();
const images = new CloudinaryImages(settings);
if (!images.enabled)
  throw Error("Configure Cloudinary credentials before running image cleanup.");
const d = await connect(settings);
try {
  console.log(
    JSON.stringify({ processed: await cleanNoticeImages(d, images) }),
  );
} finally {
  await d.client.close();
}
