# DiscoverSalah backend and local setup

For the current timetable authority, publication and weekly oversight rules, see [Timetable publishing](docs/TIMETABLE_PUBLISHING.md). Older references to focal approval for each timetable update describe the legacy workflow only.

The React frontend uses the Express API and your configured persistent MongoDB replica set. No browser demo records are imported. Keep `backend/.env` private and retain its encryption keys: changing them makes existing encrypted records unreadable.

## Run locally

For hosting, follow [Render + GitHub Actions](docs/RENDER_AND_GITHUB_ACTIONS.md). The free deployment uses hourly `worker:once:start`, independently of the API; the continuous worker below remains the local-development option. See the [script directory guide](scripts/README.md) before running operator commands.

From `backend`, run `npm run build`, `npm run db:check`, then `npm start`. In another terminal run `npm run worker:start`. From `frontend`, run `npm run dev -- --port 5173 --strictPort`. Open http://127.0.0.1:5173. Use this exact host consistently for the cookie and configured `WEB_ORIGIN`.

The frontend proxies `/api` to port 4000. The development API binds to loopback. `GET /health/live` checks the process; `GET /health/ready` checks MongoDB. `db:check` validates indexes and prints counts, never the URI. No Google routing is configured; arrival estimates remain unavailable as requested. The worker delivers in-app notifications and performs hourly retention cleanup; no SMS service is required.

## First administrator

Administrator password reset is handled by the trusted server operator. From `backend`, `node node_modules/tsx/dist/cli.mjs scripts/reset-local-admin.ts --execute` targets the admin identified in the existing private setup file, writes a fresh 24-hour temporary password, revokes sessions and preserves MFA. Focal/representative resets remain with their issuers.

The first administrator has been provisioned with the identity supplied by the project owner. Open the ignored local file `.local-admin-setup.txt` privately. Import its TOTP secret into an authenticator using SHA1, six digits and a 30-second period. Store the recovery codes in a private password manager. Sign in with the contact number and temporary password, enter the authenticator code, then choose a new password and sign in again. The temporary password expires 24 hours after issuance. Once the credentials are stored securely and sign-in succeeds, remove the setup file. Do not send its contents in chat or commit it.

For a different, empty installation only:

```powershell
npm run admin:setup -- --name "Administrator Name" --phone "+923XXXXXXXXX"
```

This refuses an existing administrator or existing setup file. Never rerun it to reset an existing administrator. The lower-level `bootstrap` command is operator-only and takes private environment variables; it is not a public recovery endpoint.

## Onboard real staff and mosques

1. Administrator creates an area, then creates focal-person credentials for it.
2. Administrator assigns the focal person as the area's responsible focal person.
3. Focal person signs in, changes the temporary password, then creates representative credentials in that area.
4. Representative changes their temporary password and registers their mosque with the real Imam contact and timetable.
5. Assign the responsible maintainers and perform independent registration verification before publication. A person cannot approve their own submission, including an administrator.
6. Representative submits timing changes; the focal person records the actual Imam call and approves, returns or rejects that version.

Credentials, resets and contact-number changes follow exactly admin → focal and focal → representative. The issuer confirms identity/contact details independently; **there is no SMS OTP requirement**. Password resets revoke existing sessions and require another first-login password change. Administrator authenticator MFA is separate from contact confirmation. Retired SMS/invitation endpoints return 410.

## Optional notice images

The backend supports one image per notice, scoped uploads/reviewer previews, independent approval, and expiry cleanup. It compresses JPG/PNG/WebP locally into a WebP up to 1600 pixels per side and 1 MiB before uploading to authenticated Cloudinary storage. Browsers display the compressed file directly; the original is not retained. Compression reduces usage but does not guarantee remaining within the free allowance.

Follow [Notice image setup and API contract](NOTICE_IMAGES.md) to add the three Cloudinary credentials to the backend environment and start the cleanup worker. Text notices continue working with credentials blank. The frontend supports image selection, progress/retry, review previews, revision retention/removal and approved public display in English/Urdu. The worker checks image expiry every minute in addition to existing retention work.

## Validation commands

- `npm test`: policy and isolated MongoDB replica-set tests. Does not use your `.env` database.
- `npm run test:images`: image authorization, compression and cleanup tests; no real Cloudinary credentials required.
- `npm run test:browser:images`: isolated representative → focal → public notice-image browser flow; build frontend first. Uses Edge and synthetic storage, not Cloudinary.
- `npm run build`: TypeScript compilation.
- `npm run test:browser`: isolated MongoDB + local Edge browser smoke test; first build the frontend. Requires installed Microsoft Edge and frontend dependencies.
- `npm run retention`: redact eligible closed applications and expired credential replay ciphertext.
- `npm run retention:replay`: replay the separately restored deletion ledger before serving a restored database.

The optional Compose replica set is for local development only and uses a persistent Docker volume. Docker has not been exercised on this machine. Never run `seed:demo` against your real database; synthetic data belongs only in a dedicated test/demo database.

See `docs/IMPLEMENTATION_REPORT.md` for architecture, verification and remaining limitations, and `docs/FRONTEND_HANDOFF.md` for integration contracts. Production hosting, backups/restore drills, routing calibration, load tests and physical old-Android validation remain separate work.

## Before deployment and backups

Use [release readiness](docs/RELEASE_READINESS.md) for current dependency and regression results. Follow [backup and restoration](docs/BACKUP_AND_RESTORE.md) to protect MongoDB, encryption keys and admin recovery material and rehearse recovery in an isolated database. A written runbook is not a completed production restore drill.
