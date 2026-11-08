> Current policy (8 November 2026): representative direct publishing, 7-day confirmation reminders and 14-day focal follow-up supersede earlier timetable approval descriptions. See [current policy](TIMETABLE_PUBLISHING.md).

# DiscoverSalah implementation and integration report


## Current release preparation — 5 November 2026

See [release verification](RELEASE_READINESS.md) for dependency remediation and assignment-refresh regression checks, and [backup/restore runbook](BACKUP_AND_RESTORE.md) for free-tool operator steps. Dated test counts below are historical, not current release totals.

## Notice image backend update — 3 November 2026

Frontend integration verification: production frontend build and 30 frontend tests passed; backend TypeScript check passed. The isolated Edge browser flow passed mobile format validation, stable-key retry after a simulated upload failure, submission, private pending access, reviewer image confirmation, public image display, Urdu RTL without horizontal overflow, revision retention/removal, mosque-switch reset and expiry cleanup. Mobile form/public and desktop review screenshots were visually inspected. Browser storage is synthetic; it does not constitute another live Cloudinary test.

Implemented authenticated Cloudinary assets, owner/mosque-scoped uploads, optional notice attachments, approval-protected public delivery, and leased expiry cleanup with retries. Sharp compresses locally before storage (5 MiB/24-megapixel still input; WebP quality 80; maximum 1600 pixels per side and 1 MiB output; metadata removed). No Cloudinary incoming/delivery transformation is requested. Images are decoded normally by browsers; discarded detail is not recoverable. Free-tier usage remains dependent on traffic and account usage.

See [setup and API contract](../NOTICE_IMAGES.md). Frontend upload progress/retry, readable preview, review confirmation, public display and revision/removal are integrated. Browser coverage uses isolated MongoDB and fake storage with real compression, without consuming Cloudinary credits. The owner reported successful Cloudinary operation after correcting environment credentials/permissions; the live diagnostic remains `npm run images:check`. The advisories recorded on 3 November were rechecked during the 5 November dependency update; current versions and verification are recorded in RELEASE_READINESS.md.

Updated 23 October 2026. The local frontend is connected to a persistent MongoDB-backed API. The first administrator is provisioned. This report supersedes the earlier demo-only frontend and SMS-onboarding notes; it does not certify production readiness.

## Delivered behavior

- Server session restoration, contact-number/password sign-in, administrator TOTP/recovery-code MFA, logout, mandatory temporary-password replacement and session revocation.
- Administrator → focal and responsible focal → representative credential issuance, reset and independently confirmed contact-number change. No SMS OTP or email verification is required for this policy. Temporary passwords expire after 24 hours.
- Public catalog and protected, scoped workspace read models. Existing pages issue API commands instead of mutating browser-persisted records. No fictional fixtures were imported into the configured database.
- Timetable proposals, independent call-evidence approvals/returns/rejections, call attempts, future activation, supersession and escalations.
- Draft mosque registration, independent publication checks, reviewed profile/Imam-contact changes, representative reconfirmation, disputes and maintenance status changes.
- Community submissions, private tracking/withdrawal, scoped investigation and public responses; notices with moderation; area/maintainer/backup assignments; account deactivation; duplicate assessments; notifications and delivery retry/escalation.
- API, local worker and frontend startup instructions, first-admin private setup file, and maps/MFA setup guide.

## Why this structure

A TypeScript modular monolith keeps one deployable API while separating authentication, venues, schedules, community, notices and administration. Native MongoDB collections and explicit command schemas make indexes, transaction boundaries and projected fields visible. A separate worker handles durable asynchronous delivery so a notification failure cannot undo an approval.

The frontend retains its pages/components/domain structure. `services/api.ts` owns transport and retry keys; the provider owns session/read refresh; feature pages submit explicit commands. A compatibility DTO keeps existing page design intact while moving authorization and persistence to the server. Screen-specific cursor queries now bound list payloads; searchable selectors hydrate selected records, and effective timetable heads are resolved independently of history pagination.

## Security and reliability decisions

Password hashes use salted scrypt. Sensitive contact/evidence fields use authenticated encryption; tokens are hashed or keyed. Server-side sessions use HttpOnly cookies and authentication versions. Origin/CSRF checks, schema/body limits, role/scope checks and rate limits guard commands. Production mode requires HTTPS configuration; local processes bind to loopback.

Transactions combine expected revisions, current-account write fences, audit events and outbox entries. Idempotency keys protect uncertain retries. Publication requires independent authority; admin privileges do not bypass self-review prevention. Public DTOs exclude private contacts and call evidence. Temporary credential replay ciphertext expires and is removed by retention. Closed rejected/withdrawn applications are redacted after 90 days; deletion-ledger replay prevents restored backups resurrecting those fields.

Only locale preferences are persisted by the runtime browser storage adapter. Credentials and CSRF/MFA state remain in memory. Views refresh after writes and revalidate every 30 seconds while visible and on focus/reconnection. Network errors remain visible; the app does not fabricate successful saves or route estimates.

## Older Android considerations

Management screens are lazy loaded and assets are bundled locally. Routing SDKs are not downloaded. The production JavaScript target is Chrome 80. Application calls to randomUUID, structuredClone, Array.at and replaceAll were removed; idempotency uses 128-bit Web Crypto randomness. This is a compatibility target, not certification on every Android release. Physical low-memory device, accessibility and slow-network testing remain necessary. A mobile viewport test is not a real-device performance benchmark.

## Verification evidence

- Backend build passed; 26 tests passed, including a temporary MongoDB replica set. Coverage includes authorization, issuer hierarchy, CSRF/origin, revocation, concurrency, idempotency, self-review denial, future-effective timing, private/public DTO separation, tracking, retention and contact-number replacement.
- Frontend build passed and 27 tests passed, including three external Maps URL validation/privacy tests.
- Isolated Edge browser test at 390 × 844 passed: representative timetable edit/submission, independent focal approval, representative credential creation, administrator MFA and mandatory first password change. Database assertions confirmed persistence; no browser runtime errors were observed. The final run also disabled randomUUID and structuredClone and used reduced-motion/keyboard submission.
- Persistent configured MongoDB connection/index check passed: one active administrator, zero venues. No synthetic mosque/staff data was written to this database.
- Local readiness endpoint and frontend-proxied public catalog succeeded. API/worker/frontend were started for local use; terminal processes must remain running.

## Remaining boundaries

External Google Maps directions links are implemented. Paid Maps/Routes APIs and in-app ETA remain disabled under the selected local approach. `MAPS_AND_MFA_SETUP.md` explains the selected links and optional future API setup; adding an API key alone does not install a provider. Notifications are in-app; no external SMS/email service is enabled.

The former global workspace caps have been replaced with per-screen cursor pagination (default 20, maximum 50), selected-record hydration and independent effective timetable resolution. Larger-scale latency, query plans and load still require operational measurement. Duplicate assessments do not destructively merge independent histories. Returned registrations now have a combined correction/resubmission editor with atomic history preservation and fresh independent review. Newly connected account/tracking text needs a full Urdu copy review.

Production hosting, automatic backups and restore rehearsal, encryption-key rotation, supervised operations, measured load/reliability targets, route calibration and physical old-Android acceptance have not been completed. No cost-free API usage guarantee or production availability guarantee is claimed.


## Navigation update 22 October 2026

The owner selected external Google Maps URLs. Directions now have a separate public page that works without a selected timetable session, validates public entrance coordinates, preserves walking/two-wheeler mode and omits visitor origin. No automatic Google request, map SDK, API key or billing setup is used. Simulated maps are replaced with location choices. In-app ETA, reachability and future forecasts remain unavailable. Five Documents Word files were updated with a current baseline and targeted comments; originals are archived under .project-reference. See Documents/CURRENT_SYSTEM.md.

The extended isolated browser test passed directions without a timetable session, both travel modes, Urdu RTL, and absence of automatic Google requests, followed by the existing submission, approval, credential issuance and administrator MFA flows. External navigation was not followed, so this verifies link behavior rather than Google's route accuracy. All 52 document revisions were found in rendered PDFs; modified pages were visually reviewed and original tables/media preserved.


Returned-registration verification completed 23 October 2026: both production builds passed, 26 backend tests and 27 frontend tests passed, and the extended mobile browser flow passed without runtime errors. Configured MongoDB indexes were applied without adding synthetic records. The local API readiness check and frontend responded successfully; a direct worker cycle passed after one startup retry. API, frontend and worker are running locally.
