# DiscoverSalah backend and local setup

The React frontend uses the Express API and your configured persistent MongoDB replica set. No browser demo records are imported. Keep `backend/.env` private and retain its encryption keys: changing them makes existing encrypted records unreadable.

## Run locally

From `backend`, run `npm run build`, `npm run db:check`, then `npm start`. In another terminal run `npm run worker:start`. From `frontend`, run `npm run dev -- --port 5173 --strictPort`. Open http://127.0.0.1:5173. Use this exact host consistently for the cookie and configured `WEB_ORIGIN`.

The frontend proxies `/api` to port 4000. The development API binds to loopback. `GET /health/live` checks the process; `GET /health/ready` checks MongoDB. `db:check` validates indexes and prints counts, never the URI. No Google routing is configured; arrival estimates remain unavailable as requested. The worker delivers in-app notifications and performs hourly retention cleanup; no SMS service is required.

## First administrator

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

## Validation commands

- `npm test`: policy and isolated MongoDB replica-set tests. Does not use your `.env` database.
- `npm run build`: TypeScript compilation.
- `npm run test:browser`: isolated MongoDB + local Edge browser smoke test; first build the frontend. Requires installed Microsoft Edge and frontend dependencies.
- `npm run retention`: redact eligible closed applications and expired credential replay ciphertext.
- `npm run retention:replay`: replay the separately restored deletion ledger before serving a restored database.

The optional Compose replica set is for local development only and uses a persistent Docker volume. Docker has not been exercised on this machine. Never run `seed:demo` against your real database; synthetic data belongs only in a dedicated test/demo database.

See `docs/IMPLEMENTATION_REPORT.md` for architecture, verification and remaining limitations, and `docs/FRONTEND_HANDOFF.md` for integration contracts. Production hosting, backups/restore drills, routing calibration, load tests and physical old-Android validation remain separate work.
