> **21 October 2026 integration update:** Runtime data and authentication now come from the MongoDB-backed API, superseding older browser-demo descriptions below. See `backend/docs/IMPLEMENTATION_REPORT.md` and `backend/docs/FRONTEND_HANDOFF.md` for current behavior and limits. Routing remains unavailable by the project owner's choice. Screen presence is not a claim of production acceptance.

# DiscoverSalah frontend

Responsive React + TypeScript application based on the fifteen core screens and the supporting Screen Inventory. The visual system uses forest green, mint surfaces, Inter and Noto Sans Arabic. Fonts and illustrations are bundled locally.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Use Management → a sample workspace to explore representative, Focal Person and administrator flows. The administrator preview challenge uses `123456`. These are explicit demonstrations, not authentication.

```sh
npm run typecheck
npm test
npm run build
npm run format:check
```

## Source organization and rationale

| Directory | Responsibility | Why it is separate |
| --- | --- | --- |
| `src/app` | Router, context contracts and application provider | Keeps composition and shared state out of page rendering. |
| `src/pages/public` | Discovery, location, results, mosque/session details and information | Each route has a focused entry point. |
| `src/pages/community` | Reports, suggestions, contributor applications, receipts and tracking | Groups the anonymous submission journey. |
| `src/pages/auth` | Sign-in, invitation, recovery and access states | Centralizes account entry flows without mixing them with public discovery. |
| `src/pages/management` | Role workspaces, editors, verification and operations | Reuses scoped pages across roles instead of duplicating whole dashboards. |
| `src/layouts` | Public shell, management shell and global UI | Navigation, responsive chrome and access checks stay consistent across pages. |
| `src/components/ui` | Buttons, fields, panels, badges, dialogs and empty states | Shared presentation primitives have no domain decisions. |
| `src/components/discovery`, `management`, `common`, `feedback` | Reusable application components | Components are grouped by purpose, not collected in a single oversized file. |
| `src/domain` | Schedule selection, permissions and arrival policy; colocated tests | Pure functions allow important rules to be tested without rendering React. |
| `src/hooks` | React access to state, scope and discovery query | Pages share the same filtering and state lifecycle. |
| `src/services` | Browser persistence adapter | Provides an explicit seam for replacing local data with an authenticated API. |
| `src/data` | Fictional fixtures and informational copy | Sample content is separated from business rules. |
| `src/types` | Shared domain and draft contracts | Keeps data contracts consistent across screens. |
| `src/i18n` | Shared language labels | English/Urdu text and RTL rendering preserve the same underlying values. |
| `src/styles` | Design tokens, shared styling and responsive rules | A single stylesheet is sufficient for the present shared visual system. |
| `src/utils` | Small ID and date helpers | Only domain-independent helpers belong here. |

Dependencies flow from pages/hooks toward domain/types, never from domain back into React. Shared state uses Context because this local prototype has one compact data model; adding a separate state framework would duplicate infrastructure. URL search parameters preserve discovery across list/map/details. Sensitive editor drafts stay in memory. Dialogs use native `<dialog>` for focus containment and Escape behavior.

`npm run imports` uses TypeScript's import organizer; `npm run format` uses Prettier. Do not recreate the original flat, multi-page modules or add a generic helpers file for unrelated rules.

## Scope and operating limits

See [screen coverage](docs/SCREEN_COVERAGE.md). Public browsing and management journeys are connected, with local sample state, scoped role checks, immutable proposal history, independent timetable decisions, future-effective schedules and dated cancellations.

This is a frontend preview. Sample records persist in this browser under `ds-demo-v1`; role selection is tab-local under `ds-role`. Do not enter real private contacts. This client cannot provide enforceable authorization, secure tracking tokens, tamper-proof audit, transactional version locking, live delegation or durable delivery. Those must be implemented server-side before launch.

Maps are labeled illustrations. Route estimates remain explicitly unavailable; the UI does not manufacture walking/motorcycle arrival confidence. The directions action hands off to Google Maps. Authentication/recovery/invitation delivery, database persistence, real map/geocoding/routing, notification workers, secure contact storage and backup enforcement remain integration work. Some operational status values retain English; final Urdu copy and legal text need review.

Future-departure forecasts and automatic reminders are deliberately excluded by the project requirements. No production deployment has been performed. See the production routing setup below.

## Production routing on Vercel

Set the Vercel project Root Directory to `frontend`. `vercel.mjs` configures the Vite build and proxies `/api/*` and `/health/*` to the backend before the SPA fallback. Set the Vercel build environment variable `API_PROXY_TARGET` to the deployed backend HTTPS origin, without an `/api` suffix. Missing or invalid configuration stops deployment. Do not point it at the frontend itself, which would create a proxy loop. Redeploy after changing it.

The backend must be deployed separately, with `NODE_ENV=production`, `WEB_ORIGIN` equal to the exact frontend HTTPS origin (no trailing slash), and its MongoDB and encryption settings configured. Set `TRUST_PROXY_HOPS` for the actual trusted proxy topology. Keep backend secrets on the backend; do not use `VITE_` variables for them. A preview frontend needs a backend configured for that preview's origin; production origin checks are intentionally not relaxed.

Browser requests remain same-origin at `/api/v1`; the proxy preserves the `/api` prefix. Keep backend session cookies host-only, Secure and HttpOnly. The worker still runs as a separate backend process. Local Vite development continues to proxy to `http://127.0.0.1:4000` by default.

Run `npm run test:deployment` to check routing configuration. After deploying, verify `/health/ready` returns JSON, `/api/v1/session` returns an API response rather than HTML, a nested frontend page reloads, and sign-in, MFA, session restoration, a protected write and logout work over HTTPS. Confirm API failures and unknown API paths remain API errors. Configuration tests do not replace these live proxy/cookie checks.

Management page modules use route-level lazy loading so public discovery does not download every administration screen at startup. A data router supports shared unsaved-form navigation guards. The detailed inventory audit and its acceptance boundaries are maintained in `docs/SCREEN_COVERAGE.md`.
