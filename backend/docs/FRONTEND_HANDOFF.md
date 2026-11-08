> Current policy (8 November 2026): routine timetable updates publish directly. See [Timetable publishing](TIMETABLE_PUBLISHING.md). Historical approval descriptions below apply only to legacy pending timetables and other separately reviewed records.

# Frontend integration contract

## Account recovery — 4 November 2026

`/recovery` provides issuer/operator guidance. Email-reset request, verification and reset pages and account email settings have been removed. Admin MFA, local-operator password reset, authenticated password change and focal/representative issuer resets remain supported.


## Notice images — frontend and backend integrated (3 November 2026)

Use the [notice image API contract](../NOTICE_IMAGES.md). Fetch management `/notice-images/config`, upload raw file bytes to `/notice-images?venueId=<uuid>` with existing session/Origin/CSRF/idempotency headers, preview the returned URL, then include `imageId` in notice creation. Show validation errors and keep retry keys stable for the same file/mosque. Revisions must explicitly retain `imageId` when desired. Public and management notice DTOs include `imageUrl`; management also includes `imageId`. Do not construct Cloudinary URLs or expose secrets.

Input accepts still JPG/PNG/WebP up to 5 MiB and 24 megapixels. Backend compression produces WebP quality 80, at most 1600 pixels per side and 1 MiB stored; overly complex images return 422 and busy processing returns 503. `NoticeImagePicker` uploads raw bytes with progress and stable retry keys, previews the processed image, and allows explicit removal. Pending/failed uploads block saving; changing mosques cancels the request and clears the attachment. `NoticeImage` renders scoped API paths with a readable full-image link and a missing-image fallback. No decompression API is needed.

Reviewers must load and confirm the poster before the approval button enables. The backend continues to enforce independent review and scope. Public detail/list/mosque notice-board views display only approved active notices. Revisions keep an author's own active attachment unless explicitly removed; other authors upload a new copy. Dates in revision forms are converted to Pakistan local input values. Upload state stays in memory and is not persisted to browser storage. Run the isolated `npm run test:browser:images` from backend after building frontend.

Updated 21 October 2026. The existing React screens now use real API reads and explicit commands. The server owns authorization and persistence.

## Source boundaries

`frontend/src/services/api.ts` handles same-origin requests, in-memory CSRF/MFA state, request timeouts and retry idempotency. `app/providers/AppProvider.tsx` restores the server session, loads the scoped read model, submits commands, refreshes after saves and revalidates visible views every 30 seconds/on focus. `services/preferences.ts` persists only locale preferences. Demo fixture storage is no longer imported by the running app.

`GET /api/v1/catalog` returns public DTOs. `GET /api/v1/management/workspace` returns a role-scoped DTO compatible with the existing screen types. It excludes password hashes, credential secrets and unrelated private records. This compatibility boundary preserves existing page/layout design while removing client-side authority. Lists use screen-specific cursor pagination, with default 20 and maximum 50 records per page. Searchable selectors load needed records and recover a selected record if a background refresh omits it. Effective timetable heads are resolved separately from visible history pages.

## Session sequence

POST `/auth/sign-in` with contactNumber/password. Representatives and focal persons receive a cookie, account and csrfToken. Administrators receive a challenge, then POST `/auth/mfa` with challenge/code. Keep challenge and CSRF token in memory; session cookie is HttpOnly. GET `/session` restores the account/CSRF state. `mustChangePassword` blocks protected management endpoints until POST `/auth/change-password` succeeds; this revokes all old sessions and requires another sign-in. POST `/auth/sign-out` clears the server session.

Prefix the following commands with `/api/v1/management`. Send `X-CSRF-Token`, `Idempotency-Key`, cookies, JSON and the exact configured Origin. Preserve the same idempotency key for an uncertain retry, never for a different operation. API errors have `error.code` and `error.message`; 409 means reload/review current state. A network timeout does not prove that a transaction failed.

| Screen area          | Commands                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Credentials          | `/credentials`, `/accounts/:id/reset-credentials`, `/accounts/:id/contact`                                    |
| Timetables           | `/venues/:id/proposals`, `/proposals/:id/decision`, `/proposals/:id/call-attempts`, `/proposals/:id/escalate` |
| Mosque onboarding    | `/registrations`, `/registrations/:id/decision`                                                               |
| Profile/Imam changes | `/venues/:id/changes`, `/changes/:id/decision`                                                                |
| Maintenance          | `/venues/:id/status`, existing reconfirmation and assignment endpoints                                        |
| Administration       | area creation, assignments, backup coverage, account deactivation, duplicate assessments                      |
| Community            | public `/requests`; token-authenticated tracking/withdrawal; protected decisions/follow-up                    |
| Notices              | create draft/submission, independent review and cancellation                                                  |
| Notifications        | read/read-all and failed outbox retry/escalation                                                              |

Consult route schemas for exact command fields. Registration, profiles, timetables and notices are independently reviewed; changing browser state cannot publish them. Evidence and contact details stay private. Do not fabricate evidence to satisfy required fields.

## Identity policy

Only administrators issue focal credentials; only responsible focal persons issue representative credentials in their areas. A temporary password lasts 24 hours and must be changed. Issuance results are encrypted for short-lived idempotent replay; expired ciphertext is cleaned by retention. Share issued passwords privately. The frontend never stores these passwords in browser storage. Account phone changes revoke sessions and require issuer confirmation. No SMS/invitation OTP flow remains active.

## Local-only boundaries

No live maps/routing or external SMS delivery. No transfer of fictional browser records into MongoDB. Some newly integrated account/tracking wording still needs a complete Urdu copy review. Screen-specific pagination is implemented; large-volume performance and load testing remain required. Duplicate assessment records evidence; it does not destructively merge mosque histories. Returned registration correction uses `/manage/registrations/:id/edit` and `POST /management/registrations/:id/resubmit`. See `RETURNED_REGISTRATION.md` for the command and state contract.


22 October 2026: external Google Maps handoff is implemented in DirectionsPage and services/googleMaps.ts. Maps APIs remain disabled. Directions are independent of session availability; only published entrance coordinates and walking/two-wheeler mode enter the URL.

## Release and recovery operations

See [RELEASE_READINESS.md](RELEASE_READINESS.md) for current security/regression evidence and [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) for encrypted exports, key custody and an isolated restoration drill.
