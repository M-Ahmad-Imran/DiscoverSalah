import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { connect } from "./db/database.js";
const c = config(),
  d = await connect(c);
const server = createApp(d, c).listen(
  c.PORT,
  c.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.info(JSON.stringify({ event: "listening", port: c.PORT })),
);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  server.close(() => void d.client.close().then(() => process.exit(0)));
  setTimeout(() => {
    server.closeAllConnections();
    void d.client.close().finally(() => process.exit(1));
  }, 10000).unref();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
