# Backend integration handoff

Status: the frontend is a local React/TypeScript preview. Screens exist; production authentication, authorization, private data, live routing, delivery, concurrency and API failure handling are not complete. This is a proposed contract, not an implemented server API.

## Integration seams

- `src/types/index.ts`: current UI domain models (Venue, Proposal, RequestRecord, Notice, Account, Notification, Audit, Database). Treat them as display models, not database schemas or unrestricted public responses.
- `src/app/context.ts`: current UI state/actions contract.
- `src/app/providers/AppProvider.tsx`: currently reads fixtures/browser storage and exposes synchronous `update(callback)`. Replace individual mutation callers with asynchronous resource commands, then invalidate/refetch affected queries. A server cannot safely execute arbitrary client callbacks.
- `src/services/demoStorage.ts`: demo adapter only. Do not upload its stored records or use browser role selection as credentials.
- `src/domain`: schedule, permission, backup, dispute and queue rules. Reimplement authoritative checks server-side; retain frontend checks for usability.
- `src/pages/management`: editors, comparisons and review workflows. Drafts stay in memory; do not persist private call notes in unencrypted browser storage.

Recommended migration order: authenticated session and scoped reads → proposal submit/review → registrations/contact changes → public requests/notices → assignments/accounts → notifications/audit → routing. Keep an explicit demo mode; never silently fall back to fixtures when production APIs fail.

## Proposed HTTP contract (`/api/v1`)

All private endpoints derive actor and scope from the session. Return only permitted fields. Pagination responses: `{ items, nextCursor }`; identifiers are opaque strings.

| Area | Proposed endpoints | Frontend consumers |
| --- | --- | --- |
| Session | GET /session; POST /auth/sign-in; POST /auth/mfa; POST /auth/sign-out | SignIn, AccountAccess, provider/layout |
| Recovery | POST /auth/recovery; POST /auth/reset; GET /invitations/:token; POST /invitations/:token/accept | AccountAccess |
| Public discovery | GET /areas; GET /venues; GET /venues/:id; GET /venues/:id/sessions?date=&prayer= | Home, Results, MosqueDetails, SessionDetails |
| Scoped management | GET /management/venues; GET /management/venues/:id | VenueList, VenueOverview, editors |
| Proposals | POST /management/venues/:id/proposals; GET /management/proposals; GET /management/proposals/:id | TimetableEditor, ReviewChanges, Submissions |
| Reviews | GET /management/review-queue; POST /management/proposals/:id/call-attempts; POST /management/proposals/:id/decision | ReviewQueue, Verification |
| Confirmation | POST /management/venues/:id/reconfirm | VenueOverview (unchanged timings; not Imam verification) |
| Registration | POST /management/registrations; POST /management/registrations/:id/decision | Registration, RequestReview |
| Identity/contact | POST /management/venues/:id/profile-changes; POST /management/venues/:id/contact-changes; POST /management/requests/:id/decision | ProfileForm, RequestReview |
| Public requests | POST /reports; POST /suggestions; POST /applications; POST /request-access; GET /my-request; POST /my-request/withdraw | RequestForm, RequestStatus |
| Investigation | GET /management/requests; PATCH /management/requests/:id; POST /management/venues/:id/disputes; POST /management/disputes/:id/resolve | RecordQueue, RequestReview |
| Notices | GET /venues/:id/notices; GET /notices/:id; POST /management/notices; POST /management/notices/:id/revisions; POST /management/notices/:id/decision; POST /management/notices/:id/cancel | NoticeForm, Notices, public notice pages |
| People and scope | GET /management/accounts; POST /management/invitations; POST /management/accounts/:id/deactivate; POST /management/assignments; POST /management/backup-coverage | Accounts, Invitations, Assignments |
| Operations | GET /management/audit; GET /management/delivery; POST /management/delivery/:id/retry; POST /management/delivery/:id/escalate | Activity, Delivery |
| Notifications | GET /management/notifications; POST /management/notifications/:id/read | Notifications |


Implement geography administration, duplicate assessment, account password changes and maintenance aggregates using similarly scoped resource commands. Finalize route names with the backend team before wiring clients.

## Critical timetable contract

Submission request (all examples synthetic):

```json
{
  "baseRevision": 12,
  "effective": "2026-10-20",
  "times": {"Fajr":"05:20","Dhuhr":"13:30","Asr":"16:15","Maghrib":"17:40","Isha":"19:15"},
  "special": [],
  "reason": "Seasonal congregation schedule update"
}
```

POST with `Idempotency-Key: <one UUID per user intent>` and `If-Match: "12"`. The server computes author, immutable before snapshot, proposal ID/version, creation time and supersession. Return the committed proposal plus current venue revision. Never trust client-generated authors, revisions, approval states or audit entries.

A decision request includes `{ decision, expectedVersion, expectedVenueRevision, publicReason, evidence: { outcome, person, calledAt, notes } }`. Recheck active account, current scope/backup window, independence, exact version and evidence inside one transaction. Reviewer cannot approve their own submission, including an administrator. No answer is a pending call attempt, never approval. Separate private call notes from public-facing reasons.

Approval and activation are different: future schedules activate on their effective date. Existing approved data remains public while a change is pending; confidence changes only for the affected prayer/date. Dated cancellation must never fall back to a recurring session. Preserve separate Khutbah and Jama’at times. Return dates as YYYY-MM-DD, mosque-local times as HH:mm, and event timestamps as ISO-8601 with offset; this release uses Asia/Karachi.

Create the decision, audit entry and outbox work transactionally. Delivery retry cannot change approval. Use idempotent workers and stable event IDs. Publish revised notices only after moderation; preserve the previous published version until replacement approval.

## Errors and asynchronous UX

Use an envelope such as `{ error: { code, message, fieldErrors, requestId, retryAfterSeconds } }`.

- 401: clear protected state; return to sign-in with a validated local destination.
- 403: stop the action and show changed/revoked access; do not reveal the record.
- 409/412: preserve safe draft input, reload the exact record and require renewed review.
- 422: map fieldErrors to controls and keep entered values.
- 429: respect Retry-After, keep safe inputs and prevent repeated submission.
- Timeout after POST: outcome is uncertain. Query the idempotency result before retrying the same key; never generate a new intent automatically.
- 5xx/offline: preserve timetable browsing with an explicit freshness warning; do not claim live reachability.

Buttons need pending states and protection from duplicate clicks. Use abortable requests and discard stale responses when prayer/date/origin changes. Backend validation remains mandatory even when UI buttons are disabled.

## Privacy and security boundaries

Use server-managed secure HttpOnly sessions, CSRF protection for cookie mutations, and a configured same-origin API or explicit CORS allowlist. API secrets never belong in VITE_* variables. Only a public API base URL may be exposed to the browser. Add runtime response validation at the API adapter boundary.

Do not return private Imam contacts, applicant contacts, verification notes, tracking tokens or internal investigations in public venue/request payloads. Return a public DTO separately from a management DTO. Request tracking must use secure short-lived access, not unrestricted ID lookup. Account recovery must not enumerate accounts. Invites/recovery tokens need expiry, revocation and single use enforced on the server. Audit data is append-only and scoped.

## Sidebar guide

The previous timetable walkthrough is removed. On each representative sign-in, the management layout highlights the sidebar and My mosques link with a glowing border and directional arrow, dimming the rest of the workspace. Selecting the link or dismissing the guide ends it; no focal-person tour remains. No persistent guide preference is required.

## Verified contact number accounts

Use `contactNumber` as the account identifier for sign-in, invitations and recovery. Store canonical E.164 numbers on the server, parsing national numbers with an explicit country context. Verify ownership through an approved phone verification provider; rate-limit challenges, expire codes and enforce single use. The frontend does not send real codes or mark a number verified. `contactVerifiedAt` must be server-owned. Account number changes require re-verification and an audited recovery process; never let a new number verify itself. Do not infer verification from an administrator entering a number. Existing email-based accounts require a controlled migration before removing email login. Contributor applications now collect a private contact number; unrelated public contact emails remain optional.

## Acceptance checklist

Before switching off demo mode, verify: all role scopes and backup expiry; self-approval denial; concurrent review conflicts; idempotent submit/timeouts; future activation and canceled sessions; private/public DTO separation; expired/revoked invitation and tracking access; notification failure recovery; representative sidebar guide per sign-in; keyboard/mobile/Urdu RTL behavior. Existing `npm test` covers pure domain rules; it does not establish server security or live integration.
