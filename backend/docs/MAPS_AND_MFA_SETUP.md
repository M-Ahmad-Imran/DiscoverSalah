# Free mapping options and administrator MFA

Checked against official documentation on 21 October 2026. No paid service, billing account or API has been enabled by this work. The selected approach is now implemented: external Google Maps links. In-app route estimates remain unavailable.

## Recommended zero-API-cost option for the local app

Use a normal Google Maps link built from the mosque's approved entrance coordinates. Google states that Maps URLs need no API key and open the mobile Maps application or browser. This avoids loading a map SDK into DiscoverSalah, which is useful for older phones. It opens navigation externally; it does not supply an ETA to our backend or enable arrive-before-Jama'at rankings. [Official Maps URLs guide](https://developers.google.com/maps/documentation/urls/get-started)

Implementation procedure:

1. Record and independently check the mosque entrance latitude/longitude during registration.
2. Build a URL using `new URL('https://www.google.com/maps/dir/')` and URLSearchParams: `api=1`, `destination=<latitude>,<longitude>`, and `travelmode=walking` for walking.
3. For motorcycle directions, the implemented link sets `travelmode=two-wheeler`; confirm availability in Google Maps. For a general location pin, use `/maps/search/` with `api=1` and `query=<latitude>,<longitude>`.
4. Label the link “Open Google Maps”, open only after a user click, and let the user choose their location/travel mode in Google Maps. Never silently treat driving as motorcycle routing.
5. Keep DiscoverSalah arrival estimates marked unavailable. This link-based approach is implemented; the paid routing adapter remains disabled.

No Google Cloud project, card, Maps key, SMTP service or SMS service is required for this option.

## Google APIs for embedded maps and app-calculated routes

Google's global monthly free allowances currently include Dynamic Maps 10,000 map loads; Compute Routes Essentials 10,000 events; Compute Routes Enterprise 1,000 events. Usage above an allowance is chargeable. These are separate SKU allowances, not one shared free request pool. [Official pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

Two-wheel routing uses Enterprise billing. Route Matrix counts origin × destination elements, not just HTTP requests. Thus comparing one origin with twenty mosques consumes twenty matrix elements. [Routes billing](https://developers.google.com/maps/documentation/routes/usage-and-billing) Pakistan is listed for two-wheel coverage, but real journeys still need validation before we make arrival-confidence claims. [Two-wheel coverage](https://developers.google.com/maps/documentation/routes/coverage-two-wheeled)

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) and create a dedicated project named DiscoverSalah Local.
2. Link a billing account if choosing billable Maps/Routes APIs. Free allowances do not remove this prerequisite; do not purchase a subscription just to develop locally.
3. In APIs & Services → Library, enable Maps JavaScript API only if embedding a map, and Routes API only if requesting route durations. Existing mosque coordinates mean Places/Geocoding are not automatically needed.
4. In APIs & Services → Credentials, create separate keys for browser maps and backend routes. Limit each key to its intended API. Set browser website restrictions for the local origin, e.g. `http://127.0.0.1:5173/*`; add `http://localhost:5173/*` only if actually used. Backend keys belong only on the server; restrict by the server's public egress IP where supported, updating it if your home IP changes. Do not apply website-referrer restrictions to the server key. [Key setup](https://developers.google.com/maps/documentation/javascript/get-api-key)
5. In Google Maps Platform → Quotas, reduce available request quotas before testing. Keep a separate application counter/limit for expensive motorcycle matrix elements. Daily/monthly safeguards must account for every project sharing the billing account. [Quota controls](https://developers.google.com/maps/documentation/routes/usage-and-billing)
6. Add billing alerts under Billing → Budgets & alerts. Alerts-only budgets notify you; they do not stop API spending. Do not rely on an email alert as a zero-cost guarantee. [Budget documentation](https://docs.cloud.google.com/billing/docs/how-to/budgets)
7. Keep the route key in `backend/.env` only when the provider integration is implemented. Adding a key alone will not activate routes: this version has no Google route adapter. Never use a VITE-prefixed variable for the private backend key. A browser Maps key is visible by design and must be restricted.
8. After provider integration, test walking/motorcycle responses, unsupported routes, timeout/quota errors, attribution and API failure states. Validate the route allowance policy and field journeys before enabling confident arrival rankings.

If zero possible API charges is a strict requirement, stay with the link-based option rather than activating billed APIs.

## Free administrator MFA

The backend already implements standard TOTP locally. It has no per-code SMS/email/provider charge. Google Authenticator generates codes offline and can be used without a Google account. Google's current help page lists Android 6.0 or newer. [Authenticator documentation and installation](https://support.google.com/accounts/answer/1066447)

1. Install Google Authenticator on the administrator's phone. Keep the phone's date/time automatic.
2. Open `backend/.local-admin-setup.txt` privately on your computer.
3. In the authenticator, add a setup key manually. Use DiscoverSalah Administrator as the label and the file's `TOTP secret` as the key. Choose time-based codes: SHA1, 6 digits, 30-second period. Do not enter the account password as the TOTP key.
4. Open http://127.0.0.1:5173/sign-in, enter your contact number and temporary password, then enter the authenticator's current code.
5. Set a new private password when prompted, then sign in again with it and an authenticator code.
6. Save the recovery codes privately; each can replace an authenticator code once. Once stored safely and sign-in is confirmed, remove the local setup file. Do not paste the TOTP secret or recovery codes into chat.

Authenticator MFA applies only to the administrator. Focal persons and representatives use issued credentials and mandatory password changes, without SMS OTP. Email MFA is unnecessary for cost reasons here and is not implemented; switching would require email ownership verification, delivery configuration and recovery policy changes.
