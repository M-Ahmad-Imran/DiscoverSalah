# Screen inventory audit

Audited against `Documents/Screen Inventory.docx` on 2026-10-17. The source contains **82 unique numbered items**. All source paragraphs match `.project-reference/Screen Inventory.txt`.

**Coverage:** 80 in-scope items have frontend page, tab, form or dialog surfaces. P14 is conditional and excluded by the project scope; S15 explicitly permits deferring a dedicated policy settings UI. A surface being present does not mean its production service is integrated or every acceptance state has passed browser testing.

Shared pages are intentional: role-aware layouts and reusable domain rules keep the same registration, schedule and review record consistent across workspaces. Screens live under `src/pages`; reusable UI under `src/components`; authorization and scheduling rules under `src/domain`; persistence under `src/services`; shared effects under `src/hooks`.

| ID | Inventory screen | Frontend surface |
| --- | --- | --- |
| P01 | Home / Find a Jama’at | `/` |
| P02 | Choose Location | `/location` |
| P03 | Search Results | `/results` |
| P04 | Map Results | `/map` |
| P05 | Search Filters and Sorting | `/results: filter panel` |
| P06 | Whole City Discovery | `/results?scope=city` |
| P07 | Friday Prayer Finder | `/results?prayer=Jumu’ah` |
| P08 | Eid Prayer Finder | `/results?prayer=Eid` |
| P09 | Mosque / Venue Details | `/mosque/:id` |
| P10 | Full Timetable | `/mosque/:id: timetable tab` |
| P11 | Session Details and Arrival Estimate | `/mosque/:id/session` |
| P12 | Travel and Preparation Settings | `/mosque/:id/session: mode and preparation settings` |
| P13 | Directions Handoff | `/mosque/:id/directions` |
| P14 | Future Departure Planner — Conditional | `Excluded: conditional future-departure planning` |
| P15 | Timing Status Explained | `/timing-status` |
| P16 | Participating Areas and Coverage | `/coverage` |
| C01 | Mosque Notice Board | `/mosque/:id: notice board` |
| C02 | Announcement Details | `/notice/:id` |
| C03 | Report Incorrect Information | `/report` |
| C04 | Suggest a Missing Mosque | `/suggest` |
| C05 | Become a Community Contributor | `/contribute` |
| C06 | Contributor Application | `/apply` |
| C07 | Submission Receipt | `/receipt/:id` |
| C08 | Track My Request | `/track` |
| C09 | Application Decision / Withdrawal | `/track: decision and withdrawal` |
| A01 | Management Sign In | `/sign-in` |
| A02 | Accept Invitation / Activate Account | `/invitation` |
| A03 | Admin Second-Factor Verification | `/mfa` |
| A04 | Request Account Recovery | `/recovery` |
| A05 | Reset Password / Recovery Completion | `/reset-password` |
| A06 | My Account and Security | `/manage/account` |
| A07 | Notifications | `/manage/notifications` |
| A08 | Access Unavailable | `/access-unavailable` |
| A09 | Session Expired | `/session-expired` |
| R01 | Representative Dashboard | `/manage: representative overview` |
| R02 | My Mosques and Venues | `/manage/mosques` |
| R03 | Mosque Management Overview | `/manage/mosques/:id` |
| R04 | Register Mosque / Associated Venue | `/manage/register` |
| R05 | Edit Mosque Information and Facilities | `/manage/mosques/:id/profile` |
| R06 | Private Imam Contact / Request Contact Change | `/manage/mosques/:id/contact` |
| R07 | Daily Timetable Editor | `/manage/mosques/:id/edit: daily tab` |
| R08 | Dated Overrides and Exceptions | `/manage/mosques/:id/edit: dated overrides` |
| R09 | Friday and Eid Session Manager | `/manage/mosques/:id/edit: Friday/Eid sessions` |
| R10 | Review and Submit Changes | `/manage/mosques/:id/review-changes` |
| R11 | My Submissions | `/manage/submissions` |
| R12 | Submission Details / Correct and Resubmit | `/manage/submissions/:id` |
| R13 | Confirm Timings Unchanged | `/manage/mosques/:id: unchanged confirmation` |
| R14 | Manage Mosque Notices | `/manage/notices` |
| R15 | Create / Revise / Cancel Notice | `/manage/notices/new; /manage/notices/:id/edit` |
| R16 | Assigned Issues and Follow-up | `/manage/reports; /manage/requests/:id` |
| R17 | Mosque Activity History | `/manage/history` |
| F01 | Focal Person Dashboard | `/manage: focal overview` |
| F02 | Review Queue | `/manage/reviews` |
| F03 | Mosque Registration Review | `/manage/registrations; /manage/requests/:id` |
| F04 | Timing Change Review | `/manage/review/:id` |
| F05 | Record Verification Call | `/manage/review/:id: call evidence and attempts` |
| F06 | Return / Reject Submission | `/manage/review/:id: reasoned decision dialog` |
| F07 | Contact / Identity Change Review | `/manage/contact-changes; /manage/profile-changes; /manage/requests/:id` |
| F08 | Announcement Review | `/manage/notices: source evidence and moderation` |
| F09 | Area Mosques and Data Quality | `/manage/maintenance` |
| F10 | Local Representatives | `/manage/representatives; /manage/accounts/:id` |
| F11 | Invite / Assign Representative | `/manage/accounts/invite; /manage/assignments` |
| F12 | Public Reports Queue | `/manage/reports` |
| F13 | Report Investigation and Resolution | `/manage/requests/:id: investigation and dispute controls` |
| F14 | Missing-Mosque Suggestions | `/manage/suggestions` |
| F15 | Urgent Work and Escalation | `/manage/escalations` |
| F16 | Area Review History | `/manage/history` |
| S01 | Service Overview Dashboard | `/manage: administrator overview` |
| S02 | Cities and Areas | `/manage/areas` |
| S03 | Focal Persons | `/manage/accounts: Focal Persons filter` |
| S04 | Focal Person Details and Assignment | `/manage/accounts/:id; /manage/assignments` |
| S05 | Management Accounts | `/manage/accounts; /manage/accounts/invite` |
| S06 | Contributor Applications | `/manage/applications` |
| S07 | Application Assessment | `/manage/requests/:id: application assessment` |
| S08 | All Mosques and Venues | `/manage/mosques` |
| S09 | Reassignment and Backup Coverage | `/manage/assignments` |
| S10 | Escalated Reviews and Reports | `/manage/escalations; /manage/reports` |
| S11 | Duplicate Listing Assessment | `/manage/duplicates` |
| S12 | Maintenance and Coverage Reports | `/manage/maintenance` |
| S13 | Audit History | `/manage/history: search, actor, record and date filters` |
| S14 | Notification Delivery Failures | `/manage/delivery` |
| S15 | Operational Policy Settings — Recommended | `Deferred: optional operational policy settings` |

## Supporting pages

All eight are present: `/about`, `/how-it-works`, `/help`, `/contact`, `/privacy`, `/terms`, `/guidelines`, `/accessibility`. Legal and policy text still needs owner approval before release.

## Gaps completed during this audit

- Combined review queue with type, mosque, escalation and event/effective date filters.
- Scoped account details and workload, focal-account filtering, and area-aware representative invitations.
- Notice drafts, returned/rejected moderation, expiry filtering, and preservation of a published notice until its revision is approved.
- Structured verification-call attempts and before/after special-session comparison.
- Delivery failure inspection, retry queueing and escalation, separate from proposal approval.
- Associated prayer-ground registration and primary-listing designation in duplicate assessment.
- Audit actor, record and date filtering; existing search covers action/version text.
- Unsaved navigation guards on timetable, notice and registration forms.
- Request access shared between lists and detail routes; private investigation notes separated from public responses.
- Public dated overrides/cancellations, future-approved schedules, started-session explanation, travel-mode/preparation controls, and exact prayer/date pending indicators.

## Integration and acceptance boundaries

This remains a **local frontend preview**, not a production service. Sample sign-in/MFA, invitations, recovery, private request access and role checks require secure backend implementations. Browser storage is for synthetic demo data only. A real delivery worker must process retries; the preview deliberately leaves them queued. Mapping, geocoding, route durations and reachability estimates are not connected; usable timetable/list fallbacks are shown.

The interface includes location-denied/manual fallback, missing origin, empty results, map/route unavailable, offline warning, scoped disputes, provisional/canceled/started sessions, maintenance state, review version conflict, unreachable call attempts, duplicate warnings, form validation, access-unavailable and 404 fallbacks. API-dependent loading/partial-routing, uncertain submission, rate limiting, secure token lifecycle and cross-session revocation still require end-to-end integration and acceptance tests. Do not claim those production states are verified merely because a route exists.

No unapproved stale/overdue thresholds or review deadlines were invented. Date filters show event/effective dates; operational target calculations require approved policy. Full bilingual, accessibility and responsive acceptance checks remain release work.

Browser revalidation in this audit was blocked: the computer-use runtime failed to initialize with “failed to write kernel assets: The system cannot find the path specified.” Earlier screenshots are not evidence for these latest changes.

## Verification

See `src/domain/inventoryWorkflows.test.ts` for regression coverage of area scoping, queue composition, delivery idempotence and approval isolation, notice expiry boundaries, and dated pending-change scope. Existing tests cover timetable policies, dispute scope and backup assignments. Run `npm run test`, `npm run build` and `npm run format:check` from `frontend`.

Final automated results: **24/24 tests passed**, TypeScript + Vite production build passed, and Prettier check passed. Management routes load independently; initial JavaScript is 433.68 kB (135.64 kB gzip).
