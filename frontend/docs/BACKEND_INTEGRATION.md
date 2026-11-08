# Backend integration

Current timetable policy: `POST /management/venues/:id/proposals` returns `Published` directly for authorized publication. Public schedule selection accepts `Approved` (historical) and `Published` versions. Focal/admin publication additionally requires `contactMethod` and `contactSource`. Representatives use `/reconfirm`; focal oversight uses `/follow-up` and paginated `/follow-ups`. Workspace venue DTOs include `freshness`, and dashboard counts include `confirmationDue` and `followUpNeeded`. See [full contract](../../backend/docs/TIMETABLE_PUBLISHING.md).

The frontend uses the authenticated API, not browser demo storage. Current API/UI contracts are maintained in [Frontend handoff](../../backend/docs/FRONTEND_HANDOFF.md), [Backend setup](../../backend/README.md), and [Notice images](../../backend/NOTICE_IMAGES.md).

`src/services/api.ts` owns transport, CSRF and retry keys; `AppProvider` restores sessions and refreshes scoped data. Server commands enforce authority and persistence. Synthetic fixtures remain only for tests. Password recovery uses the existing issuer/operator process; administrator MFA remains required.
