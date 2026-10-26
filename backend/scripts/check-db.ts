import { config } from "../src/config/env.js";
import { connect, indexes } from "../src/db/database.js";

try {
  const d = await connect(config());
  try {
    await indexes(d);
    console.info(
      JSON.stringify({
        connected: true,
        indexesReady: true,
        accounts: await d.accounts.countDocuments(),
        venues: await d.venues.countDocuments(),
        administrators: await d.accounts.countDocuments({
          role: "admin",
          active: true,
        }),
      }),
    );
  } finally {
    await d.client.close();
  }
} catch (error) {
  // Driver messages can contain connection details; never print them here.
  console.error(
    JSON.stringify({
      connected: false,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
}
