# DiscoverSalah current system

## Current timetable policy — 8 November 2026

Assigned representatives publish routine timetable versions directly. No focal approval or scheduled worker is needed for publication or its in-app notification. Confirm unchanged times every seven days; focal follow-up is due at fourteen days. Call/visit records are encrypted and auditable; overdue dates do not automatically remove a mosque or representative. Focal/admin corrections require contact evidence. Existing pending timetables retain legacy review; registration, identity changes and notice approvals remain separate. [Current operating guide](../backend/docs/TIMETABLE_PUBLISHING.md) supersedes older timetable-approval descriptions below and in historical references.

## Code organization and usability — 8 November 2026

The free deployment now has a finite hourly GitHub Actions worker and bounded frontend readiness handling for Render cold starts. See the [deployment procedure](../backend/docs/RENDER_AND_GITHUB_ACTIONS.md). Production compilation excludes tests, browser checks and training captures; capture sources moved to `backend/scripts/media`. The [documentation index](README.md) separates current operations from historical references.

Public discovery now explains the unfamiliar-area use case, distinguishes GPS from city browsing, and hides optional coordinate entry. GPS clears conflicting city filters. Mobile controls and accessibility descriptions were improved; development-only diagnostics are hidden in production. The [Pakistan UX review](PAKISTAN_UX_REVIEW.md) records findings and the remaining participant/mobile-device acceptance work.

## Release preparation — 5 November 2026

Screen-specific pagination is implemented; older global-workspace limits are historical. Assignment selectors now reload missing selected records after background refresh, and assignment submission waits for those records. Selector pagination also avoids an initial search debounce resetting the selected page. Both dependency audits report zero known vulnerabilities. Both production builds, 42 backend tests, 30 frontend tests, 2 routing checks, a clean frontend install and the assignment/image browser regressions passed. See [release checks](../backend/docs/RELEASE_READINESS.md) for current dependency and regression evidence, and [backup and restoration](../backend/docs/BACKUP_AND_RESTORE.md) for the operator procedure. Production hosting, an actual off-device backup/restore drill, full Urdu review and physical-device/load acceptance remain separate.

## Workspace and account recovery update — 4 November 2026

Email password recovery has been removed at the owner's request. Admin sign-in still requires MFA; a trusted server operator can reset the admin password using the private local setup workflow. Administrator → focal and focal → representative password resets remain. The public recovery page provides issuer/operator guidance. No email provider or recovery-email worker is configured.

See the root [workspace README](../README.md) for the folder map. Original screen and branding references are now under `design/screens/` and `design/posts/`. The unused browser-demo storage adapter, one-off localization codemods, duplicate screen archive, capture logs, Python caches and intermediate video clips have been removed. Original documents, finished videos, reusable source media, tests and private credentials are retained.

Cleanup verification: both production builds, 42 backend tests and 30 frontend tests passed. The isolated Edge browser flow passed mobile/Urdu pagination, timetable submission and independent approval, registration corrections, focal credential issuance, admin MFA and mandatory password change, and the issuer/operator recovery page. The screen ZIP was removed only after all 32 archived files matched extracted copies by SHA-256. Real database records and admin credentials were preserved; only the removed email-provider settings were stripped from the backend environment. Restart any already-running API/worker process to load the cleaned code and environment.


## Notice image backend update — 3 November 2026

The backend now accepts one optional image per notice with mosque/owner scope, independent moderation, private reviewer previews and public access only for published, unexpired notices. Images are compressed locally using Sharp before Cloudinary upload: still JPG/PNG/WebP input up to 5 MiB and 24 megapixels becomes WebP quality 80, at most 1600 pixels per side and 1 MiB stored. Orientation is corrected and metadata removed. The browser displays the compressed image directly; lost detail cannot be restored. Original uploads are not stored in Cloudinary.

The worker deletes expired assets with retries, preserving shared images until the latest linked expiry. Public expiry remains enforced if the worker is offline. Compression and cleanup reduce usage but do not guarantee remaining within Cloudinary's free allowance. Setup, credentials, endpoints and operational limits are documented in [Notice images](../backend/NOTICE_IMAGES.md). Frontend image uploads, progress/retry, previews, focal image confirmation, revision retention/removal and public display are integrated in English/Urdu. The owner reported the Cloudinary connection working after correcting credentials/permissions. Browser verification uses isolated storage and real compression; live provider checks remain available through `npm run images:check`. The dated baseline below describes earlier verification.

Updated 23 October 2026. This is the current local implementation baseline. The five Word documents in this folder have targeted revisions, explanatory comments and a current-release opening page. Their requirement/screen identifiers are retained. Where older embedded diagrams or API sketches conflict, this baseline and the actual route schemas govern. Original files are preserved in `.project-reference/original-documents-2026-10-22/`.

## Selected maps approach

DiscoverSalah opens Google Maps externally using ordinary Maps URLs. No API key, Google Cloud billing account, map SDK, geocoding service, map tiles or paid routing integration is required. The local application sends no automatic request to Google when its pages load.

Users select a published mosque and open its directions page. That page works even when there is no selected Jama’at session. Clicking **Open Google Maps** opens a new tab/application with the mosque entrance coordinates. Walking uses `travelmode=walking`; motorcycle uses `travelmode=two-wheeler`. Actual availability is controlled by Google Maps, and users should confirm the selected mode there. The link includes no visitor origin, private Imam contact, account identifier, password or API key. Links use `noopener noreferrer` and a no-referrer policy.

Google Maps handles the starting point and navigation. DiscoverSalah receives no ETA or route result, does not calculate arrival margins and does not promise arrival before Jama’at. Timetables and verification remain separate. Simulated street maps/pins have been replaced with location selection. An invalid coordinate or unpublished mosque cannot generate an outbound directions link.

Official URL specification checked on 22 October 2026: https://developers.google.com/maps/documentation/urls/get-started . Google APIs remain a future option, subject to separate integration, billing controls and route validation. See `backend/docs/MAPS_AND_MFA_SETUP.md`.

## Identity and management

Only an administrator issues focal-person credentials. Only the responsible focal person issues local representative credentials within assigned areas. Independent issuer checks confirm the person's contact details and authority. This is not SMS-based verification of SIM ownership.

Temporary passwords last 24 hours and must be changed before management access. Issuer resets and contact-number changes revoke sessions. Administrator MFA uses locally verified authenticator TOTP or a single-use recovery code. No SMS/email provider is required. Focal persons and representatives do not use OTP onboarding. Imam phone calls remain a separate evidence-based verification step for proposed times; account contact confirmation does not approve a timetable.

A representative submits an immutable timetable proposal. An independent authorized reviewer records actual Imam-call evidence and approves, returns or rejects it. Approved future timings activate on their effective date. Admin cannot approve their own submission. Registration, profile/contact changes, notices, disputes, maintenance, assignments and in-app notifications use scoped server commands.

## Storage and local operation

React/TypeScript/Vite is the frontend; Node.js/Express and the native MongoDB driver implement a modular API. Persistent MongoDB stores accounts, venues, proposals, decisions, sessions, audit and durable outbox work. A separate worker delivers in-app notifications and processes retention. Browser fixtures are not used as live records.

Run the API on loopback port 4000, frontend on http://127.0.0.1:5173 and worker separately. The frontend proxies `/api` to the API. Keep environment keys private. No production hosting has been provisioned. See `backend/README.md` for commands and onboarding order; credentials and MFA secrets are deliberately excluded from these documents.

Public DTOs exclude private contacts/evidence. Commands enforce current account/scope, CSRF/origin, revisions and idempotency. Sensitive data is encrypted; passwords are salted hashes. Temporary credential replay ciphertext expires. Closed rejected/withdrawn applications are redacted after 90 days, with a deletion ledger for backup-restoration cleanup.

## Historical verification and remaining launch work

Verification finalized 23 October 2026: the frontend production build and all 27 frontend tests passed. The backend suite now has 26 passing tests. The extended isolated browser test passed external directions without a selected session, walking/motorcycle mode, Urdu RTL, and no Google request before user action, alongside the submission/approval/credential/MFA flows. Google's external route accuracy was not tested. All 52 Word revisions were confirmed in rendered PDFs and modified pages were visually reviewed. Refer to the implementation report for details.

The build targets Chrome 80 and avoids newer application APIs such as randomUUID and structuredClone. Physical old-Android performance/accessibility acceptance remains outstanding. Screen-specific cursor pagination and searchable selectors are implemented; selected records and effective timetable heads are loaded independently of the visible page. Large-volume performance and load acceptance still need measurement. Complete Urdu copy review, production backups/restore drills, key rotation and measured reliability/load acceptance remain open. This is a tested local system, not a certified production launch.

## Documents updated

- Proposal: current local scope, external navigation, persistence and issuer hierarchy.
- SRS Phase 1: revised FR-01/02/09/12/13/14/16 and routing acceptance boundaries.
- SDS Phase 2: implemented architecture, account lifecycle, API contract and validation status.
- Phase 3 DTS: current deployment, no-key Maps handoff, contact-number credentials and local MFA.
- Screen Inventory: P02/P03/P04/P11/P12/P13, A01–A05 and staff credential/application descriptions; original IDs retained.

## Returned-registration correction (23 October 2026)

Implemented: open **My mosques → the returned mosque → Correct and resubmit registration**, or use the same link on its registration request. The existing five-step form is prefilled with the saved details, entrance, private Imam contact, timetable and facilities. Reviewer feedback appears above it. Confirm contact permission and the final review again before submitting. The area stays fixed; existing special sessions and the initial effective date are preserved.

The server accepts only a returned draft at the exact edited revision, from its assigned representative or an authorized original submitter. Corrections, encrypted prior-version history, contact verification reset, reopened review task, audit and focal notification are committed together. The mosque remains unpublished and requires fresh independent approval. Rejected or published registrations cannot use this operation. Older records without an explicit registration state use their latest recorded decision.

This update supersedes the earlier combined-editor follow-up in the archived release notes and Word documents. See `backend/docs/RETURNED_REGISTRATION.md` for the API and operational details.
