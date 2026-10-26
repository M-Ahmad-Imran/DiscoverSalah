# DiscoverSalah current system

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

## Verification and remaining work

Verification finalized 23 October 2026: the frontend production build and all 27 frontend tests passed. The backend suite now has 26 passing tests. The extended isolated browser test passed external directions without a selected session, walking/motorcycle mode, Urdu RTL, and no Google request before user action, alongside the submission/approval/credential/MFA flows. Google's external route accuracy was not tested. All 52 Word revisions were confirmed in rendered PDFs and modified pages were visually reviewed. Refer to the implementation report for details.

The build targets Chrome 80 and avoids newer application APIs such as randomUUID and structuredClone. Physical old-Android performance/accessibility acceptance remains outstanding. Compatibility workspace limits are 200 venues, 1,000 proposals and smaller feeds; screen-specific pagination is needed before larger coverage. Complete Urdu copy review, production backups/restore drills, key rotation and measured reliability/load acceptance remain open. This is a tested local system, not a certified production launch.

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
