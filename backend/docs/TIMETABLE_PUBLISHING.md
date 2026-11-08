# Timetable publishing and weekly oversight

Policy implemented 8 November 2026. This supersedes earlier instructions requiring focal approval for every timetable change. Registration, identity/location changes, notices and their independent-review rules remain separate.

## Representative workflow

1. Sign in, open an assigned mosque and choose Edit timetable.
2. Enter actual mosque congregation times, including dated exceptions or cancellations. Set today or a future effective date and a reason.
3. Review every changed time and date, tick the confirmation and choose Publish timetable.
4. A new immutable `Published` version is stored. It becomes eligible immediately for its effective date. No review task or worker is required; a focal in-app notification is created in the same transaction.
5. Every seven days check the current timetable. If unchanged, use Confirm timings unchanged. Do not invent edits to show activity.
6. Correct errors by opening a historical version with Correct as a new version, checking all values and publishing again. History is retained; this is not destructive rollback. A later effective-date version can still supersede the correction, so inspect future versions too.

Only active staff with current assignment authority can write. Direct publication requires a published, identity-verified mosque with both responsible staff assigned. Revision checks, idempotency, account fences and transaction boundaries remain enforced. Registration approval is never bypassed by publishing a timetable.

## Seven-day and fourteen-day rules

Elapsed days use server timestamps: reminder at exactly seven days; focal follow-up at exactly fourteen. The latest representative reconfirmation is the baseline; before the first confirmation, use identity approval or creation time. A representative publishing a schedule effective today also confirms the current timetable. Publishing a future schedule does not confirm today's timetable. A focal correction or contact log does not reset representative confirmation.

Dashboard counts and filtered paginated lists are computed when requested; they need no scheduled worker. These are in-app reminders, not SMS, WhatsApp or phone push notifications. Overdue dates never automatically hide a mosque, declare its times wrong, deactivate an account or replace its representative.

## Focal oversight

Open Maintenance & coverage and select 14+ days: follow-up needed. Call or visit the representative or imam, then record the method, outcome and private notes. Outcomes are Times confirmed, Correction requested, No contact or Replacement needed. Notes are encrypted. Management lists show a date/outcome summary; authorized focal reviewers and admins can open the paginated private contact history. Representatives and public visitors cannot read those notes. An append-only follow-up record and audit event preserve the contact.

If replacement is warranted, use Replace representative after checking, select the replacement account and record the reason in Assignments. The previous representative immediately loses write authority for that mosque; do not deactivate their entire account if they still serve other mosques. Existing account deactivation separately revokes sessions.

For an urgent correction, the responsible focal person (or administrator) may use the timetable editor, but must record Phone/Visit and who confirmed it. The source is encrypted with DATA_KEY and never included in public output. Focal users cannot claim a representative's unchanged-time confirmation. Backup reviewers retain their existing scoped review/follow-up authority; backup assignment alone does not grant direct editing authority.

## Existing data and rollout

- `Approved` historical timetable versions remain readable and eligible alongside new `Published` versions. Both use effective date then version ordering.
- Existing `Submitted` versions are not silently promoted. Their legacy review flow remains available; an assigned representative can instead check the draft and publish a new version, superseding old pending versions and closing their tasks.
- No destructive migration or key rotation is needed. Deploy backend before frontend; refresh old browser tabs after rollout. Keep DATA_KEY/TOKEN_KEY unchanged.
- Public labels say published/current, not focal-approved. Representative confirmation and registration contact checks are distinct facts.
- Run `npm run db:indexes` through the normal Render startup. Backups must include `timetableFollowUps` and existing proposals, notifications and audit collections; the normal whole-database backup includes them.
- Worker maintenance is still required for notice-image deletion, other queued notifications and privacy retention. Timetable publication, direct timetable notifications and computed reminder lists do not depend on it.

## Acceptance

Test today's and future publishing, special-session cancellation, stale-revision conflicts, duplicate-submit replay, withdrawn assignment access, seven/fourteen-day boundaries, scoped follow-up lists, private-source redaction, focal corrections, replacement authority and old pending submissions. Confirm changes appear through the deployed frontend proxy. Open visible pages normally refresh every 30 seconds; network outages and hosting cold starts can still delay retrieval.
