# DiscoverSalah

Current timetable workflow: assigned representatives publish directly, confirm every 7 days, and focal persons follow up after 14 days. See the [operating guide](backend/docs/TIMETABLE_PUBLISHING.md) and [current training videos](video/README.md). Registration and notice verification remain separate.

Find participating mosques, congregation times and approved community notices. Management is handled by local representatives, focal persons and administrators.

## Workspace map

Start with the [documentation index](Documents/README.md), [free deployment guide](backend/docs/RENDER_AND_GITHUB_ACTIONS.md), and [Pakistan usability review](Documents/PAKISTAN_UX_REVIEW.md). Training capture scripts live in `backend/scripts/media`; production builds exclude tests and media tooling.

| Folder                | Contents                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| `frontend/`           | React application, UI tests and deployment proxy configuration         |
| `backend/`            | API, workers, database models, integration tests and operator scripts  |
| `Documents/`          | Project requirements, original deliverables and current system summary |
| `design/screens/`     | Original screen mockups and design reference                           |
| `design/posts/`       | Branding and social-post assets                                        |
| `video/`              | Finished videos, captions, scripts and reusable production assets      |
| `.project-reference/` | Historical document originals, searchable extracts and review evidence |
| `.video-tools/`       | Locally installed video-generation dependencies (ignored by Git)       |

## Run and verify

See [backend setup](backend/README.md) and [frontend setup](frontend/README.md). Use `http://127.0.0.1:5173` consistently locally. Run the API and worker separately; the worker handles notification delivery and expired notice-image deletion.

From `backend`: `npm test`, `npm run build`. From `frontend`: `npm test`, `npm run build`. After building the frontend, `npm run test:browser` and `npm run test:browser:images` from `backend` exercise isolated browser flows with synthetic data.

Current contracts: [system summary](Documents/CURRENT_SYSTEM.md), [notice images](backend/NOTICE_IMAGES.md), and [frontend handoff](backend/docs/FRONTEND_HANDOFF.md). Historical requirements and mockups remain reference material; current route schemas govern implemented behavior.

## Credentials and account access

Keep `backend/.env` and `backend/.local-admin-setup.txt` private. Admin sign-in requires MFA. Focal persons receive password resets from administrators; representatives receive them from their responsible focal person. Admin password reset is a trusted local-operator action using `backend/scripts/reset-local-admin.ts`; it preserves MFA and revokes sessions. Email password recovery is not part of this application.

Do not run demo seed scripts against the real database. Finished videos, original documents and media sources are retained; generated caches and intermediate clips can be recreated.

## Deployment preparation

[Release checks](backend/docs/RELEASE_READINESS.md) · [Backup and restoration procedure](backend/docs/BACKUP_AND_RESTORE.md). Production proxy/cookie checks and an off-device restore drill remain required before launch.
