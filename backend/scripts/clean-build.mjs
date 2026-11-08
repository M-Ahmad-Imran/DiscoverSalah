import { rm } from "node:fs/promises";
// Fixed generated-output directory only; never remove source or user assets.
await rm(new URL("../dist/", import.meta.url), {
  recursive: true,
  force: true,
});
