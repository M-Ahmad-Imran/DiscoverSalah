# Operator and development scripts

Run commands from `backend`. Production commands are listed in `package.json`.

| Group | Files / command | Purpose |
| --- | --- | --- |
| Database operations | `indexes.ts`, `check-db.ts`, `retention.ts` | Index validation and privacy maintenance |
| Account operations | `setup-admin.ts`, `bootstrap.ts`, `reset-local-admin.ts` | Sensitive operator-only provisioning/recovery |
| Image operations | `check-notice-images.ts`, `cleanup-notice-images.ts` | Provider verification and cleanup |
| Scheduled worker | `run-worker-once.ts` | Finite Actions maintenance pass |
| Local development | `init-env.ts`, `seed.ts` | Local configuration and synthetic seed data |
| Browser checks | `browser-smoke.ts`, `browser-notice-images.ts` | Isolated regression checks using synthetic MongoDB |
| Training media | `media/capture-*.ts` | Reproducible video screenshots; excluded from production compilation |
| Build maintenance | `clean-build.mjs` | Removes only generated `backend/dist` before compilation |

The media scripts are historical recipes for the previous approval workflow; see [media notes](media/README.md). Current workflow screenshots are produced by `npm run test:browser` and rendered by `video/create_workflow_v2.py`. Capture tooling does not belong to the runtime API.

`npm run build` uses `tsconfig.build.json` and excludes tests, browser checks and media capture. `npm run typecheck` checks all TypeScript including these tools. This separation reduces generated deployment files; development dependencies remain installed for the build. Never treat a demo seed, capture script or administrator reset as a routine deployment step.
