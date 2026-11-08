# Free deployment: Render API + scheduled GitHub worker

Updated 8 November 2026. This guide supersedes instructions requiring an always-running worker for the free deployment. Continuous `worker:start` remains available for local development or a future paid worker. See [direct timetable publishing](TIMETABLE_PUBLISHING.md) for the new representative/focal workflow.

## What changes in this deployment

- Render serves the API. Its Free service sleeps after 15 minutes without incoming traffic; startup can take about a minute. This is a best-effort pilot deployment, not an always-available production service.
- The frontend probes `/health/ready` on first use and after ten minutes without a successful API response. Concurrent requests share one check. After 1.5 seconds it shows an English/Urdu connecting message, retries readiness for at most 90 seconds, then gives a retry message. Form submissions and uploads wait for readiness and are never automatically replayed. After an ambiguous write failure, retry the same action so its idempotency key is reused.
- GitHub Actions runs maintenance hourly at minute 17 UTC (minute 17 in Pakistan too). It connects directly to Atlas and Cloudinary, never to the sleeping API.
- Each run attempts up to 200 notifications, 50 image deletions and 500 application redactions. It stops taking work after 90 seconds; an in-flight operation can finish later. The Actions job has a ten-minute ceiling. Existing leases protect notification/image retries after interruptions. Failures fail the workflow; `limited: true` means inspect the backlog and run another manual pass if necessary.
- Queued notifications for other workflows and physical image removal can lag by an hour or more. New timetable publications and their in-app notifications are stored immediately in one transaction. Seven/fourteen-day dashboard reminders are computed on read. Expired notices are hidden without waiting for the worker. GitHub scheduling is not an exact-time delivery guarantee.

## 1. Prepare the repository and accounts

1. Use your GitHub repository, Render account, MongoDB Atlas Free cluster and existing Cloudinary Free account. Keep the repository private unless you deliberately want the source public.
2. Commit the application changes and `.github/workflows/scheduled-worker.yml` to the default branch. Do not commit `.env`, admin setup files, backups, recovery codes or encryption keys. Review the Git diff before pushing; this workspace also contains unrelated prior changes.
3. Obtain your permanent frontend HTTPS origin (for example `https://your-project.vercel.app`). Use the exact origin, with no path or trailing slash. Preview origins will not be authorized automatically.
4. Back up your current MongoDB data and both existing encryption keys before migrating. Follow [backup and restoration](BACKUP_AND_RESTORE.md). A new Atlas database does not automatically contain your local accounts or mosques. Restore the intended database first, or provision a new admin only for an empty installation.

## 2. Configure Atlas

1. In Atlas, select the intended project and Free cluster. Under Database Access create an API database user with `readWrite` on the application database only (for example `discoversalah`). Use a strong generated password.
2. Create a separate worker user with `readWrite` on that same database. This allows independent credential rotation. Neither user needs Atlas project administrator privileges.
3. From Connect > Drivers, copy the `mongodb+srv://...` URI. Replace placeholders privately and URL-encode special password characters. The database selected by `DB_NAME` must match your user permissions.
4. After creating the Render service, copy **all outbound IP ranges** shown in its Connect/Outbound section into Atlas Network Access. Add your own current IP temporarily for setup and restoration.
5. **GitHub-hosted runner network access requires a decision:** standard runners have changing outbound IPs. The simplest setup is Atlas's `0.0.0.0/0` entry. This permits network connections from anywhere; it does not bypass authentication, but removes the IP restriction for the whole Atlas project. Use TLS, separate strong database credentials and database-scoped permissions. Do not assume adding Render IPs alone permits GitHub Actions.
6. If that broad network exposure is unacceptable, keep the restricted list and use a runner with controlled egress, or implement temporary runner-IP allowlisting through the Atlas API before enabling the schedule. Those options require additional infrastructure or privileged API credentials and are not configured by this workflow. Never assume one observed GitHub runner IP will work next time.

No database network rules are changed automatically by this repository.

## 3. Create the backend on Render

1. Open Render Dashboard > New > Web Service. Connect GitHub and select this repository.
2. Choose the default deployment branch and a region close to your Atlas cluster.
3. Enter these settings:

| Setting | Value |
| --- | --- |
| Name | `discoversalah-api` (or an available name) |
| Runtime | Node |
| Root Directory | `backend` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start:render` |
| Instance Type | Free |
| Health Check Path | `/health/ready` |

`start:render` ensures the existing database indexes before starting the API. If index creation fails, deployment fails rather than serving without uniqueness/security indexes. Do not delete conflicting records to bypass an index error; investigate them first.

4. In Environment add the following **privately**:

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | API user's Atlas URI |
| `DB_NAME` | Exact application database name |
| `WEB_ORIGIN` | Permanent frontend HTTPS origin |
| `DATA_KEY` | Existing 64-character hex encryption key |
| `TOKEN_KEY` | Existing independent 64-character hex token key |
| `SESSION_HOURS` | `8` |
| `TRUST_PROXY_HOPS` | `1` initially; verify proxy behavior as described below |
| `PHONE_PROVIDER` | `disabled` |
| `CLOUDINARY_CLOUD_NAME` | Existing cloud name |
| `CLOUDINARY_API_KEY` | Existing API key |
| `CLOUDINARY_API_SECRET` | Existing API secret |

Leave `PORT` unset: Render provides it, and production binds to `0.0.0.0`. Do not generate replacement DATA_KEY/TOKEN_KEY values when deploying existing data. Do not put secrets in frontend variables or the workflow YAML.

`TRUST_PROXY_HOPS` affects IP rate limiting. One trusts the immediate hosting proxy. With an additional frontend proxy, clients may share a rate-limit bucket. Do not blindly increase the hop count: the backend also has a directly reachable URL, and trusting too many hops can trust client-supplied forwarding values. Verify actual forwarding behavior through both routes before broad public traffic; if needed use an explicitly trusted proxy strategy rather than an arbitrary hop count.

5. Click Deploy Web Service. Add Render's outbound ranges to Atlas as above; if the first deployment failed before this, redeploy after network access is active.
6. Wait for the successful deploy and copy the HTTPS `onrender.com` origin.
7. Open `<backend-origin>/health/live`: expect `{"status":"ok"}`. Open `/health/ready`: expect `{"status":"ready"}`. These endpoints expose no credentials. An unauthenticated `/api/v1/session` response of 401 is normal.

## 4. Connect the frontend

1. In your frontend hosting project, set Root Directory to `frontend` and configure `API_PROXY_TARGET` to the Render HTTPS origin, without `/api` or a trailing slash.
2. Redeploy the frontend. The existing `vercel.mjs` routes `/api/*` and `/health/*` to the backend before the SPA fallback. If using another host, configure equivalent reverse-proxy routes; a frontend environment variable alone does not create a proxy.
3. Open `<frontend-origin>/health/ready`. It must return readiness JSON, not the React HTML page. Cold-start handling depends on this route.
4. Confirm Render `WEB_ORIGIN` exactly matches the browser's frontend origin. Sign in through the frontend; same-origin proxying preserves secure session cookies and CSRF protection.

## 5. Enable scheduled maintenance

1. In GitHub > repository Settings > Secrets and variables > Actions, add repository **secrets**:
   - `WORKER_MONGODB_URI`: the separate worker user's Atlas URI.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: same storage account as Render.
2. Add repository **variables** `DB_NAME` (same database as Render) and `SCHEDULED_WORKER_ENABLED` = `true`.
3. The worker does not need `DATA_KEY`, `TOKEN_KEY`, admin credentials or `WEB_ORIGIN`. Do not copy these into GitHub.
4. Confirm Atlas permits runner connections (step 2). Open Actions > Scheduled maintenance > Run workflow on the default branch. This manual trigger works even while the schedule variable is disabled.
5. Verify a green run and the `scheduled_worker_finished` summary. `imageCleanupEnabled` must be true when notice images are used. Investigate failures; they are not successful cleanup. Check Actions notifications so you receive failure emails. A run may mark an outbox job permanently failed after its existing maximum attempts; inspect and resolve persistent failures rather than repeatedly running the job.
6. Confirm the next scheduled run occurs. To pause scheduling, set `SCHEDULED_WORKER_ENABLED` to `false`. Public-repository schedules can be disabled after 60 days without activity; monitor the last successful run.

To stay free, use standard runners and review your account's current included Actions allowance and spending controls. Hourly means about 720 runs per 30 days; install/build time also counts, not just the maintenance script. The included allowance is shared with other eligible usage. Do not enable paid overages; reduce frequency if measured usage exceeds your free allowance. No cache or artifact stores database data or secrets.

## 6. Administrator and acceptance checks

For an existing restored database, use the existing administrator and authenticator. For a new empty database, run the documented `npm run admin:setup -- --name "Administrator Name" --phone "+923XXXXXXXXX"` locally from `backend`, with your private local environment explicitly targeting Atlas and using the SAME production keys. This creates sensitive local recovery information; store it securely according to [backend setup](../README.md). Render Free does not provide a shell for this step. Do not seed demo data into production.

Before sharing the site:

1. Test admin MFA, create/assign a test staff account, and publish a timetable change as its representative without focal approval. Confirm current and future dates, seven-day reminders and fourteen-day follow-up filters. Also test the separate registration/notice approvals.
2. Confirm the focal notification exists without running the worker. Use a dedicated test notice to verify image upload, deletion and eventual Cloudinary removal after maintenance runs. Do not delete real notices as a test.
3. Allow Render to become idle for more than 15 minutes with browser polling and external monitors stopped. Open the frontend again. Confirm the connecting message appears, the page recovers, and a form submits once. If startup exceeds 90 seconds, wait a few seconds and use Retry loading or retry the same action.
4. Test from more than one client to assess proxy rate limits. Validate image loading and uploads through the deployed frontend host, whose proxy limits can differ from localhost.
5. Perform the isolated restoration drill in the backup guide. Keep encryption keys and MFA recovery information in encrypted off-device storage; Render's filesystem is not a backup.

## Sleep and optional monitoring

There is no code setting that disables Render Free's idle sleep. The readiness UI handles it; the independent worker removes the dependency on API uptime. An optional external monitor can request `/health/live`, but it is not required and does not guarantee an always-warm service. Monitor usage limits and failures. For guaranteed responsiveness, a paid always-on service or a different hosting arrangement is necessary.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Deploy fails connecting to MongoDB | Atlas outbound ranges, URI credentials, DB_NAME, database user permissions |
| Health works directly but frontend waits 90 seconds | `/health/*` rewrite and API_PROXY_TARGET; check for HTML responses |
| POST returns ORIGIN_DENIED | Exact WEB_ORIGIN, including HTTPS and no trailing slash |
| Session returns 401 before sign-in | Expected; after sign-in check same-origin proxy and secure cookies |
| Worker cannot connect while Render works | GitHub runner network access and WORKER_MONGODB_URI |
| Images remain in storage | Last successful worker, matching cloud credentials, retries, backlog limits |
| Requests return 429 across different users | Forwarded client-IP topology and TRUST_PROXY_HOPS |
| Old data cannot decrypt after migration | Restore the original DATA_KEY; do not overwrite more data |

## Official references

- [Render Free limitations](https://render.com/docs/free)
- [Deploy Node/Express](https://render.com/docs/deploy-node-express-app)
- [Render Node versions](https://render.com/docs/node-version)
- [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses)
- [Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
- [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GitHub included usage](https://docs.github.com/en/billing/reference/product-usage-included)
