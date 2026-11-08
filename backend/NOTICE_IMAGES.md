# Notice image backend setup

Image storage is optional. Existing text notices work with all three Cloudinary values blank.

## Your setup steps

1. Create a Cloudinary **Image & Video APIs Free** account. No paid add-ons, upload presets or unsigned uploads are needed.
2. Open Console settings → API Keys. Copy your cloud name, API key and API secret into the three matching entries in `backend/.env`:

   ```env
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

   Keep them backend-only. Do not commit `.env` or put secrets into frontend `VITE_` variables. Set the same values in the deployed API **and worker** environment. All three values must be supplied together.

3. From `backend`, run `npm ci` to install dependencies (including the free Sharp compression library), then `npm run db:indexes` once. Restart the API (`npm run dev`, or `npm run build` and `npm start` in production). Install dependencies on the deployment host; do not copy Windows `node_modules` to Linux. Sharp's platform-specific optional dependencies must be enabled.
4. Start the cleanup worker in a separate process: `npm run worker` locally, or `npm run worker:start` after building. The worker checks image expiry every minute and retries storage failures.
5. Alternatively, have your hosting scheduler run `npm run images:cleanup:start` at least hourly after building. Each invocation processes at most 50 records; run more frequently for larger queues. A sleeping/stopped free host cannot delete files until it wakes. Public access still stops at notice expiry even while cleanup is offline.
6. Sign in and GET `/api/v1/management/notice-images/config`; `enabled: true` confirms credentials are present, **not** that Cloudinary has accepted them. A real upload/read/delete smoke test is required after credentials are added.

The representative notice form now includes an optional image picker, upload progress, processed preview, retry and removal controls. Failed/pending uploads block submission until retried or explicitly removed. Switching mosques clears the attachment. Own active images are retained in revisions; another author's image must be uploaded as a new copy. Focal reviewers see the poster and must confirm readability/details/privacy before approval. Approved images appear on the public notice detail, notice list and mosque notice board. Missing/expired images show a fallback while keeping the notice text readable. Labels and errors support English and Urdu.

## API contract

All management requests require the existing session cookie. POST requests also require the exact configured Origin, X-CSRF-Token and a unique Idempotency-Key (16–100 letters/digits/underscore/hyphen).

### Upload

`POST /api/v1/management/notice-images?venueId=<uuid>`

- Content-Type: `application/octet-stream`.
- Body: the **raw file bytes**, not multipart, JSON, a URL or a base64 string.
- JPG/PNG/WebP only, at most 5 MiB; 10 upload requests per account per hour (retries count).
- Authorization checks the assigned mosque. The backend decodes and compresses the image **before uploading to Cloudinary**, using Sharp: WebP quality 80, maximum 1600×1600 while preserving aspect ratio, no enlargement, automatic orientation, and metadata removal. Only the processed image is uploaded/stored; automatic Cloudinary backup is disabled for these uploads.
- Input must be a valid still image of at most 24 megapixels. Corrupt or animated images are rejected. The processed file must be at most **1 MiB**; overly detailed posters return `IMAGE_TOO_COMPLEX` (422) instead of silently reducing text quality further. Ask the uploader to crop or simplify the poster.
- Each API process permits two concurrent conversions, with a 15-second processing timeout. Busy processing returns `IMAGE_PROCESSING_BUSY` (503); retry shortly using the same idempotency key. This uses backend CPU/RAM, so monitor your free host.
- Returns `id`, `width`, `height`, `bytes`, `format`, `previewUrl` and `attachBefore`.
- Reusing the same idempotency key with identical content returns the same image. A different file or mosque with that key is rejected. An in-progress upload returns 409; retry the same key. An expired/deleted upload requires a new key.
- Unattached uploads are eligible for cleanup after one hour. Failed/uncertain provider uploads remain tracked for cleanup as well.

Equivalent API request (the frontend uses XMLHttpRequest for upload progress):

```js
await fetch(`/api/v1/management/notice-images?venueId=${venueId}`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/octet-stream",
    "X-CSRF-Token": csrfToken,
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: file,
});
```

### Attach and review

Include optional `imageId` in the existing `POST /api/v1/management/notices` JSON body. Omit it for text-only notices. There is at most one image per notice. The image must be ready, unexpired, uploaded by the current author and belong to the same mosque. External image URLs are not accepted.

The same uploader can reuse their image in notices/revisions for the same mosque. Attachment extends retention to the latest linked expiry, without a race against cleanup. New revisions explicitly include `imageId` to retain the image; omission creates a text-only revision. Existing notices/images cannot be silently overwritten: the normal new-revision and independent moderation process applies.

Notice DTOs (including workspace results) expose `imageUrl`, and management DTOs also expose `imageId`. Rendering an image uses:

- `/api/v1/management/notice-images/:imageId`: uploader preview or scoped reviewer preview.
- `/api/v1/management/notices/:noticeId/image`: authorized mosque management.
- `/api/v1/notices/:noticeId/image`: public, only while the notice is Published and unexpired and its mosque publicly visible.

Images are stored as **authenticated** Cloudinary assets. The backend proxies the WebP bytes; it never exposes signed Cloudinary delivery URLs. Responses use `Cache-Control: private, no-store`. This preserves moderation and expiry even before physical cleanup, but image traffic uses both Cloudinary delivery bandwidth and backend hosting bandwidth. Downloaded user copies cannot be revoked.

## Compression and the free allowance

The browser decodes the compressed WebP automatically for display. There is no separate decompression endpoint and no larger original is fetched or retained. Lossy compression and resizing cannot restore discarded detail: representatives/reviewers should inspect the preview, especially small Urdu text, before submitting/approving.

The API requests no Cloudinary incoming or delivery transformations. Compression is performed locally once per successful upload, and subsequent reads serve the stored WebP. The configuration endpoint exposes `maxStoredBytes`, `maxDimension`, and `outputFormat` alongside the original upload limit. Existing stored images are not recompressed by this change.

Smaller files and expiry cleanup reduce storage and delivery usage, but **cannot guarantee staying within a free plan**. Traffic, other assets, backups, and any transformations configured separately in Cloudinary still affect the account. Monitor Cloudinary's Usage dashboard. For illustration, 1,000 images averaging 200 KB occupy about 200 MB; 10,000 deliveries of those images transfer about 2 GB. These are estimates, not an image-count allowance. No local compression service subscription or extra credentials are needed.

## Expiry, cancellation and recovery

- First attachment sets cleanup time to notice expiry, including expiries less than one hour away.
- Reuse extends it to the latest linked expiry. Deleting an image cannot break another unexpired linked notice.
- Cancellation/rejection immediately blocks public access; physical deletion is at the recorded expiry. Abandoned uploads expire after one hour.
- Cleanup claims a lease, calls Cloudinary destroy with CDN invalidation, and marks the image deleted only on success (including already absent). Failed calls retry with backoff; expired leases recover after a crashed worker.
- Notice text, moderation history and image metadata remain for audit; the image bytes are removed. Do not add a TTL index to the image collection, because it would erase pending deletion work.
- Do not change cloud names for an existing collection without migrating assets. Cleanup only touches records belonging to its configured Cloudinary environment.
- Free storage is limited by Cloudinary's shared credit allowance; deletion does not refund past delivery/transformation usage.

## Checks

For the complete UI flow, build the frontend, then run `npm run test:browser:images` from `backend`. It uses headless Microsoft Edge, an isolated MongoDB replica set and a fake storage adapter with real compression. It checks mobile upload validation/retry, pending-image privacy, focal approval, public/Urdu display, image retention/removal in revisions, mosque switching and expiry cleanup. It does not use real mosque records or Cloudinary credits. The cleanup worker must run in deployment for physical storage deletion.

If uploads return **403** with `missing permissions (actions=["create"])`, the API key is authenticated but lacks permission to create/upload assets in that product environment/folder. In Cloudinary Console Settings → API Keys, check the selected key's role and folder access. Use a backend key permitted to create/read/delete the notice assets; if granular roles are unavailable, use the product environment's standard backend key. Changing the cloud name or adding an unsigned upload preset does not fix this permission error. Keep the key/secret server-only. The diagnostic prints redacted provider errors to help distinguish this from invalid credentials.

After supplying credentials, run `npm run images:check` from `backend`. This performs a real upload, compressed-image read and deletion using one synthetic temporary asset. It does not touch mosque records and prints no credentials or signed URLs. It uses a small amount of Cloudinary storage/bandwidth. If cleanup fails, it prints the temporary public ID for later removal. An error containing `invalid` and `cloud_name` means Cloudinary rejected the configured cloud name: copy the exact cloud name from the console and ensure the API key/secret belong to the same product environment. Then rerun the check.

`npm run typecheck`, `npm run test:images`, and `npm test` run without real Cloudinary credentials. Image tests exercise real local compression (dimensions, orientation, metadata removal and invalid input), plus storage-adapter tests for privacy, ownership, idempotency, expiry and deletion retries. Provider tests inspect the actual compressed upload bytes and request signing/parameters with fake HTTP responses. They are not a live Cloudinary verification.

References: https://cloudinary.com/documentation/dev_kickstart_acct_setup · https://cloudinary.com/documentation/upload_images · https://cloudinary.com/documentation/delete_assets
