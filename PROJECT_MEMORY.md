# DiscoverSalah project reference

Read and consolidated on 16 October 2026. This file is durable workspace context for subsequent frontend work. Read it before implementing screens; consult the source documents for full contracts and acceptance cases. The original documents remain unchanged. Text extractions are in `.project-reference/` for searchable reference.

## Source documents and precedence

- `Documents/DiscoverSalah_Proposal.docx`: v4.0, 30 September 2026; product purpose and initial operating model.
- `Documents/DiscoverSalah_SRS_Phase_1.docx`: v1.2, 4 October 2026; 26 linked stories/requirements/use cases/acceptance criteria, business rules and quality targets.
- `Documents/DiscoverSalah_SDS_Phase_2.docx`: v1.1, 5 October 2026; architecture, schemas, APIs, workflow and concurrency design, 31 planned tests.
- `Documents/DiscoverSalah_Phase_3_DTS.docx`: v1.1, 15 October 2026; implementation baseline, 15 core prototypes, PF01–PF10 corrections, 40 planned tests, accepted launch decisions.
- `Documents/Screen Inventory.docx`: comprehensive public and management inventory. Entries may be pages, tabs, panels, forms, dialogs or variants; do not build one separate page per entry.

Phase 3 section 7.4 explicitly supersedes conflicting earlier scope, language, provider, hosting and privacy assumptions. Unaffected requirements still apply. Prototypes are visual references, not authority over requirements. Numerical values explicitly marked proposed remain provisional. The source documents report no executed application tests, field calibration or independent validation; documentation and static HTML are not a production-ready service.

## Product and launch

DiscoverSalah is a free, community-maintained responsive website for finding participating mosques and their actual Jama’at/congregation start times. These are distinct from astronomical prayer beginnings and Khutbah times. Residents and travelers can browse anonymously and compare eligible walking or motorcycle arrival estimates.

The Product Owner is Muhammad Ahmad. Any consenting mosque can start the pilot once management permission, an active maintainer, private registered Imam contact, independent Focal reviewer and approved initial schedule exist. Earlier requirements for two or three complete areas are superseded. Whole City means participating venues in a selected city, never complete city coverage. No pilot city is selected by these documents; illustrative Lahore locations are not a production decision.

Launch includes English and Urdu across public and management flows. Future departure forecasts and automated user reminders are deferred. Required in-account review/decision notifications and transactional invitation/recovery emails remain included. Future-date timetable browsing and future-effective schedule approval are still required; do not confuse those with future-departure route forecasting.

No initial subscriptions, payments, donations, payroll, advertising/paid ranking, native apps, car/cycle reachability, OCR, automatic Imam calls, public social feeds, in-app chat, multi-stop or along-route journey planning. Organizational funding and staff allowances are future organizational possibilities, not features or promises. No Imam dashboard or public browsing account is needed. Janazah notices do not automatically become reachability sessions.

## Four experiences and authority

1. Public visitor: discover, view schedules/notices, open directions, report issues, suggest missing mosques, apply to contribute and privately track own requests.
2. Local Representative: maintain assigned mosques/venues, submit registration and immutable timing proposals, reconfirm unchanged times, submit notices, respond to returned work and issues.
3. Focal Person: review assigned area work, call the registered Imam, approve/return/reject exact versions, investigate issues and manage scoped representatives.
4. System Admin: appoint Focal Persons, manage geography/accounts/assignments/backups, assess contributor applications, oversee coverage, audit and delivery failures.

Accounts are individual and invitation-only. Admin creates Focal Persons; Focal Persons manage representatives within their assigned scope. Application submission grants no privilege. Reviewers cannot approve their own submissions, including Admin or backup actors. Backend authorization checks current account, record scope and assignments on every request and again at protected commit; frontend route guards are only UX.

## Discovery and session rules

- Location permission is optional. Offer manual address/area/pin fallback. Timetable browsing works without an origin; a personal ETA needs a confirmed precise origin, not just an area centroid.
- Separate scope and mode controls: Nearby versus Whole City; Walking versus Motorcycle. Nearby proposed default 5 km, maximum 7 km; Whole City uses explicit city membership without that cap. An outside-city origin is allowed. Area boundaries restrict staff authority, not nearby discovery.
- Preserve prayer/date, city, origin and filters across list/map/details, back navigation and language switching. Never silently substitute Maghrib or tomorrow when selected Asr has no upcoming sessions.
- General next-upcoming discovery may show tomorrow's Fajr with an explicit Tomorrow label and the applicable schedule.
- Use mosque wall-clock date/time in Asia/Karachi, UTC or explicit offsets for API instants and audit. Use server-aligned countdowns, refresh at least every 60 seconds while active and immediately on resume.
- Resolve approved effective windows, then dated sessions/overrides and explicit cancellations before recurring rules. Never infer missing/expired timings or resurrect a canceled event via recurrence.
- Multiple Jumu’ah sessions are distinct. Ordinary Dhuhr is not silently added on Friday without explicit confirmation. Khutbah remains separate. Eid can be provisional; outdoor grounds have their own entrance and responsibility.
- Show known facilities and unknown status honestly. Direct navigation targets the verified entrance and occurs only on user action. Explain unsupported mode handoff and refresh on return.
- Base results use stable time/session-key pagination. Route estimates load progressively without hiding unrouted matches; evaluated-batch ranking is not a globally fastest city ranking.

## Arrival estimates and trust

Margin = congregation start − departure − route duration − preparation − uncertainty. Calculate in seconds before rounding display.

Eligibility takes precedence: missing, expired, provisional, stale, disputed, currently affected pending or unmaintained sessions cannot receive positive arrival labels. Unsupported/unvalidated routes or uncertainty likewise mean unavailable, with a reason. Timetable browsing remains useful.

- Eligible margin >= 0: Estimated reachable, with assumptions and no guarantee.
- Raw arrival is before start but full allowances do not fit: Time is tight / Too tight.
- Raw arrival is at or after start: Unlikely to reach.
- Started sessions are excluded from upcoming recommendations.

Provisional settings: preparation minimum 5 minutes walking / 8 minutes motorcycle, adjustable upward; recent <=7 days, needs confirmation >7 through 14 days, stale >14 days; final event phone verification within 48 hours. These require owner acceptance and relevant field evidence. Uncertainty must be calibrated separately by mode; never default it to zero or label a car route motorcycle.

Identity verification, representative unchanged confirmation and Focal Imam-phone verification are separate facts and timestamps. Unchanged reconfirmation cannot clear a dispute, expiry or pending scope or invent a new phone check. Editing facilities/notices does not refresh a timetable. Copied unchanged rules retain their original provenance.

## Maintenance and publication workflow

Representative edits draft → compares current/proposed values, affected sessions, effective dates and reason → submits immutable full snapshot → durable review task and notification → independent Focal calls registered Imam → records contact, time, exact scope/version and outcome → approves, returns or rejects → effective-time publication and representative notification.

- One active pending schedule proposal per venue. A subsequent full proposal supersedes the old pending version and its task; recompute actual affected differences.
- Preserve current approved values separately. Only the changed prayer/date/session loses positive reachability when the pending change becomes relevant; an Asr change must not suppress unchanged Maghrib.
- Draft, Submitted, Approved, Returned, Rejected and Superseded are distinct. Future-approved is not yet effective. Reading notification is not resolving review. A save is not publication.
- Returned/rejected content stays immutable; correction creates a new version. No silent overwrite: stale expected revision gives conflict and reload/reconcile.
- Call evidence is a human record, not telecom proof. No prechecked call outcome, no automatic confirmation, and unreachable/ambiguous contact remains pending or returned. Physical visits are not required for each timing update.
- Registration captures identity, city/area, verified entrance, private Imam contact and contact permission, facilities and initial timetable. Check duplicates. Publish only after independent required approvals and assignments.
- Reassignment immediately removes former authority, preserves authorship and transfers tasks. Missing responsibility means Maintenance pending; keep useful location information but withhold positive reachability.
- Urgent work is highlighted and routed to an authorized backup. Backup scope has start/end validity. Review-hour and numeric escalation promises remain unapproved; no-response is never approval.

## Community and account supporting flows

Reports: incorrect timing/location, duplicates and other issues; Open → In review/Escalated → Resolved/Dismissed with reason. Rate-limit/group duplicates. Allegations never rewrite schedules automatically; an authorized reviewer sets a specific disputed scope.

Suggestions: name, city/area, address/pin and optional permitted private contact; duplicate matches; New, In review, Onboarding, Linked, Closed. Separate suggestion from volunteering. No automatic listing.

Applications: requested representative/Focal role, area, affiliation, availability, private contact/reference and permission; Submitted, In review, Awaiting checks, Approved, Waitlisted, Rejected, Withdrawn. Check ownership/reference/suitability; approval leads to a controlled invitation, not immediate usable authority. Admin controls Focal appointments.

Public receipts include a reference and high-entropy private tracking access; reference alone must not expose records. Tracking never reveals internal notes or other applicants.

Notices: religious events, services and death/Janazah. Representative submits; Focal moderates; sensitive notices require authorized family/mosque source evidence privately. Record venue/date/time/expiry, minimal public personal details and version. Material corrections return to review and suppress disputed details; enforce expiry on reads even with delayed worker. No comments, fundraising or schedule changes through notices.

Account UI includes invite acceptance, initial credential establishment, Admin MFA, generic recovery request, password reset, account/security, notifications, access revoked and session expired. Verified email reset token: hashed, single-use, 15-minute expiry; reset revokes sessions, notifies owner and does not auto-login. Lost email requires owner verification through an existing trusted mosque contact. Admin MFA and offline recovery codes remain required.

## Privacy and architecture

Selected stack: React + TypeScript responsive client; Node.js/Express + TypeScript modular API and worker; transaction-capable MongoDB replica set. Website hosting: Vercel. Database hosting/backup storage and durable scheduled/queue runner still need selection; do not assume a permanent worker in a request function.

Google Maps and Google Routes API are selected, with WALK and TWO_WHEELER. Provider selection is not proof of local accuracy. Validate coverage, current provider requirements, quotas/costs and field uncertainty before live positive estimates. Keep restricted routing secrets on server, provide attribution/applicable warnings and disclose provider location transfer. Quota exhaustion degrades to timetable-only estimates. Map failure leaves list results usable.

Use thin controllers, domain policies/services, repositories, provider adapters, public allowlisted DTOs and pure time/reachability policies. Opaque Secure/HttpOnly/SameSite server sessions, CSRF/origin protection, rate limits, Admin MFA and assignment-revision checks.

Core entities: Account, Assignment, City/Area, Venue, PrivateContact, ScheduleHead, immutable ScheduleVersion, recurring rules/dated sessions/exclusions, scoped Confirmation, ReviewTask/Decision, Notice versions, IssueReport, MosqueSuggestion, ContributorApplication, AuthSession, AccessToken, OutboxEvent, Notification, AuditEvent, IdempotencyRecord.

Domain mutation + revision + audit + outbox commit atomically. Notifications deduplicate by event/recipient; tasks exist despite delivery failure. Idempotent commands safely replay the same payload/key; changed payload with same key conflicts. Recheck schedule revision after routing before returning positive status. Effective-time validity and notice expiry are read-time rules.

API base `/api/v1`; versioned typed contracts, safe errors/field errors/request ID/server time, cursor pagination. Proposed default 20/max 50 results. Phase 2 uses `/discovery/query`, `/discovery/evaluate`, `/management/venues/{id}/schedules`, `/management/reviews/{id}/decisions`; Phase 3 proposes `/discover/query`, `/discover/evaluate`, `/management/venues/{id}/proposals`, `/management/proposals/{id}/decisions`. Resolve and freeze this naming difference in a single API contract before integration; do not mix both arbitrarily.

Private registered Imam phone and verification evidence belong only to authorized management. A separately permitted public office contact is a distinct optional field. Replacement Imam contact requires existing trusted channel/independent evidence; the new number cannot verify itself. No default CNIC collection. Do not persist anonymous precise origins or put origins, tokens, private phone numbers or passwords into logs.

Accepted retention: unsuccessful/withdrawn application contacts deleted 90 days after rejection/withdrawal; review unresolved applications at 90 days. Security logs 90 days. Change/approval history 12 months, with active timetable and needed provenance retained. Encrypted daily backups with 30-day rolling retention, restricted access and tested restoration. Reapply deletion records before serving restored data. Remove obsolete contacts; minimize closed-report/notice personal data.

## Core frontend map

| ID | Screen | Principal flow |
| --- | --- | --- |
| UI01 | Home / Find a mosque and Jama’at | Query → location/results |
| UI02 | Choose location | Confirm origin → retained query |
| UI03 | Search results | Compare exact sessions → details/map |
| UI04 | Map results | Same query + accessible list alternative |
| UI05 | Mosque details and timetable | Sessions/notices/entrance/report/directions |
| UI06 | Management sign in | Authorized role workspace |
| UI07 | Representative dashboard | Assigned work → mosque/register |
| UI08 | Mosque management overview | Current/pending schedules and maintenance |
| UI09 | Timetable editor | Draft → review |
| UI10 | Review and submit | Diff → immutable submission |
| UI11 | Submission details/status | History/decision/future activation/correction |
| UI12 | Focal dashboard and review queue | Scoped current tasks → review |
| UI13 | Timing verification and approval | Imam call evidence → exact-version decision |
| UI14 | Mosque registration | Duplicate check → independent review |
| UI15 | Service administration/assignments | Coverage/accounts/reassignment/oversight |

Screen Inventory expands this to P01–P16, C01–C09, A01–A09, R01–R17, F01–F16 and S01–S15 plus support pages and states. Reuse focused tabs/forms/dialogs for filters, session estimate, travel settings, coverage, notices, reports, suggestions/applications/tracking, invitations/MFA/recovery, private contact change, dated/Friday/Eid editors, unchanged confirmation, issues, registration/contact/notice review, representatives, applications, backups, audit and failed notifications. Operational policy UI is optional. Help/About/Privacy/Terms/Contact/contributor guidance can share a content template; final policy wording is separate work.

## Visual and interaction requirements

Phase 3 records Inter, body 16 px / 24 px line height, forest green, mint surfaces and white cards. Normalization tokens: primary #146B4A, background #F7FAF8, text #172B23, secondary #52635B, warning #8A4B08, error #B42318. Read `screens/devout_utilitarian/DESIGN.md` and actual HTML/assets in the next stage before finalizing design implementation.

Target 48 px controls, visible focus, labels and semantic headings, text plus color status, keyboard flow, mobile reflow and 200% zoom. Test 360/768/1280 CSS pixels. Bundle approved assets/fonts, provide text alternatives. Urdu needs an appropriate font and RTL layout; isolate numbers, phone, email, URLs and numeric times correctly. Language switch persists locally and preserves route/query/unsaved input; do not translate names or mutate timetable values.

Required states include loading, empty coverage, no matching prayer, GPS denied/unconfirmed origin, unsupported/failed/unevaluated routes, map failure, offline/stale content, provisional/canceled/started events, pending/disputed/stale schedules, maintenance gaps, duplicate listing, field errors, unsaved edits, uncertain submit outcome, version conflict, Imam unreachable, rate limit, invalid/expired invitation/tracking, session expiry, revoked access, 404 and temporary service failure. Preserve safe inputs; resolve ambiguous submit status before retrying.

## Required prototype corrections PF01–PF10

1. UI06: remove anonymous official timing-update claims; public may report/suggest only.
2. UI09/10/13: remove invented 30-minute twilight/Sunnah scheduling rules and guarantees.
3. UI05/08/13: distinguish representative confirmation from Focal call to registered Imam; do not substitute trustee/committee labels without policy.
4. UI07/15: remove established 30-day freshness/expiry claims; policy is configurable/provisional.
5. UI03/05: remove driving advice and inconsistent buffers; walking/motorcycle only with honest allowances.
6. All: allow zoom, normalize tokens, use 48 px targets and accessible reflow/focus.
7. UI06: implement real recovery flow; forgot password must not trigger an expired-session demo.
8. Multiple: replace historical dates/counts/verification badges and unapproved 24–48-hour promises; fixtures never imply production facts.
9. Multiple: connect real routes and state/role guards; developer scenario panels are not release UI.
10. All: bundle assets/fonts and handle failed external requests.

The DTS reports 8 failed-fetch PNG placeholders and 7 narrow previews among the supplied screen exports. Inspect the HTML and images directly in the next stage rather than assuming every PNG is usable.

## Verification and remaining decisions

P3-T01–T40 cover discovery continuity, city scope, arrival boundaries, eligibility, degraded routes/partial ranking, refresh/races, cancellation, Friday/Eid, timezone validation, role/privacy checks, idempotent submissions, supersession, independent approval, future activation, outbox recovery, registration, revocation races, authentication/CSRF, community flows, notices, accessibility/usability/load, restore/calibration, connected navigation, scope, unchanged confirmation, contact changes, concurrent decisions, backup expiry, bilingual continuity, recovery/retention and one-mosque launch/quotas.

Proposed quality targets: non-routing p95 <=2 seconds with 1,000 venues/5,000 sessions/50 users over 15 minutes; route timeout 8 seconds; changes reflected <=60 seconds; availability 99.5%; RPO 24 hours/RTO 4 hours. Proposed usability 4/5 successful tasks; field calibration 30 journeys per mode across representative conditions, >=95% buffered sample coverage. These are planned targets, not measured performance or guarantees.

Still needed before live launch: actual consenting mosque/city/staff/backup and review hours; threshold approval; Google quotas/budget and route evidence; MongoDB and worker provisioning; verified-email provider and session/invitation expiry; supporting UI scope/capacity; actual tests, restore rehearsal and independent review. Backend security and empirical route calibration cannot be established by a frontend demo.

## Current handoff

User asked to read and understand Documents first, then move to screens for complete frontend work. Document content has been reviewed and consolidated here. No frontend implementation has started in this step. Next: inspect the screen design guide, HTML and available assets; reconcile them with this baseline; implement the complete connected responsive frontend including supporting flows and bilingual states when the user proceeds.

### Frontend implementation update — 16 October 2026

The frontend now exists in `frontend/` using React, TypeScript, React Router and Vite. Core and supporting screens are connected using explicitly fictional browser-persisted records. The user requested a maintainable folder structure; source is separated into app, pages by audience, layouts, components, hooks, domain, services, data, types, i18n, styles and utilities. Read `frontend/README.md` for architecture rationale and `frontend/docs/SCREEN_COVERAGE.md` for route mapping and integration limits.

The production build and thirteen domain tests passed before the final input-event adjustment. Browser testing then exposed native time inputs failing to update the controlled draft; temporal inputs now use input events. Verified in the browser: change Asr, retain the draft through English/Urdu switching, submit a new immutable version, supersede the old proposal, switch to independent Focal Person preview, supply evidence, confirm approval. These are sample actions, not real mosque verification. A final build/test rerun follows that correction.

No real backend, secure authentication, live maps/routes or external notification delivery is connected. Do not describe client-only sample permissions as security. Remaining backend-dependent behavior and copy review are documented. Future-departure forecasts remain excluded. All original project documents and screen sources are unchanged by frontend implementation.

### Continuation — 17 October 2026

Completed the local backup-coverage workflow: administrator validation, stored Pakistan-time windows, review-only scope, expiry checked on decisions, revocation, account deactivation cleanup, and preserved primary ownership/publication. Domain commands live in frontend/src/domain/assignments.ts. Added scoped report disputes with explicit investigation/resolution reasons and public warnings in cards, timetable and session details. These are still client-side preview rules, not secure server authority. See updated screen coverage notes. TypeScript and the 17-test backup suite passed; final build and 19-test suite include disputes.


### Inventory audit — 17 October 2026

Compared the original Screen Inventory.docx with the extracted reference: 82 unique numbered items and every source paragraph matches. `frontend/docs/SCREEN_COVERAGE.md` now maps each item individually: 80 in-scope frontend surfaces, P14 excluded by scope, S15 optional/deferred. Added combined reviews, account detail/workload, focal filters, notice drafts/moderation/expiry, delivery retry/escalation, associated venue selection, application assessment, report grouping, maintenance details and audit filters. Fixed unscoped request access, separate private investigation/public responses, published-notice revision continuity and date-scoped pending changes. Timetable/notice/registration forms have navigation guards; management pages are lazy loaded. Public timetable honors dated cancellations and Friday behavior.

Validation: 24 tests passed; production build passed with no oversized-chunk warning (initial JS 433.68 kB, gzip 135.64 kB); formatting passed. Browser QA could not run because CUA failed to initialize its kernel assets. Vite restarted at 127.0.0.1:5173 for preview. Do not claim visual acceptance or production completeness: live auth, private storage, routing, delivery and API-driven failure/concurrency states still require integration. See coverage report for explicit acceptance boundaries.
