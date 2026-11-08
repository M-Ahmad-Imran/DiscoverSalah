# Returned registration editor

Implemented 23 October 2026.

## Representative flow

1. Open My mosques and select the returned mosque, or open its registration request.
2. Select **Correct and resubmit registration** and read the review feedback.
3. Correct details, entrance coordinates, Imam contact, daily times and facilities in the existing five-step form. Reconfirm permission to contact the Imam.
4. Review the corrected information and submit. The mosque stays unpublished, the request returns to Submitted, and a fresh independent decision is required.

The area cannot be moved by this editor. Existing dated sessions and effective date are preserved. Draft changes stay in memory; navigation warns about unsaved edits. A stale revision is rejected rather than overwriting newer work. Reload and review the latest record before retrying a conflict. Only an assigned representative or a submitter who still manages the venue can resubmit; reviewers cannot silently edit another person's submission.

## API and storage

`POST /api/v1/management/registrations/:id/resubmit` accepts the same strictly validated body as registration creation, plus the captured integer `revision`. `relationship` is an optional bounded text field for compatibility; the form requires it. Session, CSRF/origin and an Idempotency-Key are required. The command retains the venue ID and returns `{ id, status: "Submitted", revision }`.

The transaction validates current access, Draft/Returned state, revision, unchanged area and associated mosque. It stores the previous venue/contact snapshot encrypted in `registrationRevisions`, updates the draft and private contact, clears old verification, increments the revision, reopens the existing registration task, appends an audit event and queues a focal notification. Decisions are never overwritten. Same-key retries return the original result without repeating writes; different stale submissions fail. The current submitter becomes the author for self-review prevention.

`registrationState` separates pending/returned/rejected state from the public Draft status. Old records fall back to the latest registration decision, so no destructive data migration is needed. Decisions require Submitted state. Returned and Rejected records cannot be approved directly. The workspace gives scoped managers the latest feedback and corrected details; public DTOs remain unchanged.

## Why reuse the form

Creation and correction share one form and one registration schema, keeping validation and the five-step experience consistent. The edit form captures its starting revision and values once so background refreshes cannot silently replace edits. Server transactions remain the authority for permissions and publication.

## Local rollout and checks

Build the API and frontend, run `npm run db:indexes` from backend, and restart an API running compiled output. This adds indexes for registration decision lookup and unique archived revisions; it does not insert sample records. Existing encryption keys must remain unchanged. The in-app notification worker must be running to deliver the queued review notification.

Integration coverage includes return/resubmit/approve, unauthorized correction, unchanged-area enforcement, stale revisions, invalid contact permission, retry safety, preserved decision/revision history, reopened tasks and self-review denial. The browser smoke test exercises the prefilled combined editor at a mobile viewport and asserts persisted corrections in isolated MongoDB. No real registrations are changed by these tests.


Returned-registration verification completed 23 October 2026: both production builds passed, 26 backend tests and 27 frontend tests passed, and the extended mobile browser flow passed without runtime errors. Configured MongoDB indexes were applied without adding synthetic records. The local API readiness check and frontend responded successfully; a direct worker cycle passed after one startup retry. API, frontend and worker are running locally.
