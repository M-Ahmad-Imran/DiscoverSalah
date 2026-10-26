import { config } from "../src/config/env.js";
import { connect, indexes } from "../src/db/database.js";
const d = await connect(config());
try {
  await indexes(d);
  console.info("Database indexes ready.");
} finally {
  await d.client.close();
}
