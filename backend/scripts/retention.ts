import { config } from "../src/config/env.js";
import { connect } from "../src/db/database.js";
import {
  retainOneBatch,
  replayDeletionLedger,
} from "../src/workers/retention.js";

const d = await connect(config());
try {
  if (process.argv.includes("--replay-ledger")) {
    console.info({ replayed: await replayDeletionLedger(d) });
  } else {
    let total = 0;
    let count: number;
    do {
      count = await retainOneBatch(d);
      total += count;
    } while (count === 100);
    console.info({ redacted: total });
  }
} finally {
  await d.client.close();
}
