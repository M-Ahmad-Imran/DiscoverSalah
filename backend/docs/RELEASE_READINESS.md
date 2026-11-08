# Release preparation — 5 November 2026

## Direct timetable publishing — 8 November 2026

The current policy supersedes the earlier approval-based timetable workflow below. Representatives publish `Published` timetable versions directly with revision checks and idempotent transactions; current and future public reads accept both historical `Approved` and new `Published` versions. Direct timetable notifications are transactional and do not use the worker. Seven-day reminders and fourteen-day follow-up lists are computed on read. Focal call/visit notes are encrypted, scoped and available through paginated private history; overdue dates do not remove mosques or accounts.

52 backend tests and 37 frontend tests passed, including current/future publishing, legacy review compatibility, concurrent submissions, current assignment enforcement, private follow-up access, confirmation boundaries and unchanged confirmations. Backend build and frontend production build passed. The updated isolated browser flow passed direct publishing and a 14-day focal follow-up alongside the existing account, assignment and MFA regressions. See [operating and rollout guide](TIMETABLE_PUBLISHING.md); production deployment and real-user acceptance are still separate.

Updated Urdu/English workflow videos for representative, focal, admin and public overview are rendered and verified. See [training materials](../../video/README.md). They are focused policy modules; older full-guide approval sections are marked historical.

## Earlier follow-up verification — 8 November 2026

The backend's 47 tests and frontend's 36 tests pass, including finite scheduled-worker limits/failure isolation, shared cold-start readiness, timeout recovery, normal session 401 behavior, non-JSON gateway responses and preservation of write idempotency keys without automatic replay. Backend production build and full tooling typecheck passed; the frontend production build passed.

The isolated 390px Edge browser regression passed simulated API cold start, manual city browsing, GPS with conflicting city removal, directions in English/Urdu, pagination, representative submission, focal approval, all three assignment cases after refresh, and admin MFA/password change, with no runtime errors. This uses synthetic local data; Render/GitHub execution and actual user comfort have not been certified.

Production output now excludes tests, browser scripts and media capture scripts. Capture sources are retained under `scripts/media`. See [deployment](RENDER_AND_GITHUB_ACTIONS.md) and [Pakistan usability review](../../Documents/PAKISTAN_UX_REVIEW.md). No production data or credentials were deleted during this cleanup.

This records local release checks, not a production deployment certificate. Older dated totals and global-workspace limitations in project history are superseded by this page.

## Dependency security

Both backend and frontend `npm audit --json` reports returned zero known vulnerabilities on 5 November 2026, including development dependencies. An audit is a dated advisory check, not a guarantee against undiscovered vulnerabilities. Re-run it before deployment and periodically afterward.

| Component | Patched resolution | Reason |
| --- | --- | --- |
| Backend Zod | 4.6.7 | Oversized constrained-collection memory exhaustion advisory; migrated record schemas to explicit string-key/value arguments |
| Express body-parser dependency | 2.4.0 | Compressed request-body trailing-byte denial of service |
| Test tooling follow-redirects dependency | 1.16.2 | Sensitive-header handling across redirects |
| Frontend Vite | 6.4.5 | Development file-deny bypass |
| Frontend Vitest and mocker | 4.1.12 | Mocking/path traversal issues; the updated dependency tree removes vulnerable tinypool |

Direct version changes are pinned in package.json; transitive fixes are locked in package-lock.json. Do not use `npm audit fix --force` as the release procedure. npm 10's install resolver crashed on the optional peer graph during the Vitest upgrade; npm 11 was used temporarily to produce the lockfile without disabling peer checks. No global npm upgrade was made.

Advisory sources: [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [follow-redirects](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p), [Vite](https://github.com/advisories/GHSA-8g5g-mxqh-grgj), [Vitest/mocker](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [tinypool](https://github.com/advisories/GHSA-85c8-ppgw-ccpr). Migration followed the [Zod 4 guide](https://zod.dev/v4/changelog).

## Assignment and selector fixes

A background workspace refresh replaces a bounded screen payload. Previously, a selected account could remain visible in the selector's local options but disappear from the shared records used for assignment validation. RecordSelect now checks whether the selected record is actually loaded and fetches it again when necessary. Assignment submission waits until both the assignee and target are present; server-side role, scope, revision and account-state checks remain authoritative.

The selector's initial no-change search debounce also used to reset the cursor, which could bounce a quick More options action back to page one. It now schedules a search only when the text differs from the active query.

The browser regression creates an area and focal account, deliberately triggers a focus refresh, then saves primary focal, representative and temporary backup assignments without a manual search/reselection workaround. It asserts persisted assignments in the isolated database. Existing coverage also checks mobile/Urdu pagination, selected options across pages, registration correction, independent timetable approval, credential issuance and admin MFA.

## Pagination status

Screen-specific cursor pagination is implemented in `src/modules/venues/screenData.ts` and consumed by frontend screen requests. Default page size is 20 and maximum is 50. Form selectors search/page and hydrate selected records. Effective timetable heads are computed independently of paginated history. Tests reach beyond the old workspace caps. This does not establish performance at arbitrary city-wide load; measured load/device acceptance remains open.

Current-system, handoff and implementation documents have been reconciled. PROJECT_MEMORY.md preserves chronological history but begins with an explicit current-status override. Backend documentation is no longer hidden by a blanket Git ignore rule.

## Verification

- Backend production build: passed.
- Backend policy/integration/image tests: 42 passed with patched dependencies.
- Frontend unit tests: 30 passed under Vitest 4.1.12.
- Frontend production build: passed under Vite 6.4.5, retaining the Chrome 80 target.
- Production routing configuration tests: 2 passed.
- Clean frontend `npm ci` using the installed npm 10: passed with zero advisories; the updated lockfile is reproducible without npm 11 on the deployment host.
- Extended Edge browser regression: passed, including newly created focal, representative and backup assignments after forced background refresh, with persistence assertions and no browser runtime errors.
- Notice-image browser regression: passed mobile upload validation/retry, private pending previews, independent review, public/Urdu display, revision retention/removal, mosque switching and expiry cleanup.
- Documentation relative-link check: all seven current entry-point/runbook documents have valid local links.

These checks use synthetic databases/storage and do not alter production accounts, keys or Cloudinary assets.

## Before going live

1. Follow [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md): protect the data, latest deletion ledger, matching encryption keys and admin recovery material, then complete an actual isolated off-device restore drill.
2. Deploy the API and its worker; set the real frontend/backend HTTPS origins and trusted-proxy configuration.
3. Configure API_PROXY_TARGET in the frontend deployment and verify readiness, session restoration, MFA, protected writes, image flow and logout through the live proxy.
4. Verify staff authority, mosque details and initial timings with independent reviewers in a small pilot. Complete Urdu, physical-device and load acceptance.

Production backups have not been scheduled, a production restoration has not been performed, and hosting has not been provisioned by these code changes.
