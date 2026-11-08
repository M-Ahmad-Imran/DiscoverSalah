# DiscoverSalah backup and restoration runbook

Updated 5 November 2026. This is an operator procedure, not evidence that a production backup or restore drill has already run. Never experiment against the live database. Examples use Windows PowerShell and a new restore database.

## Free resources and preparation

MongoDB documents `mongodump` / `mongorestore` as the manual backup route for Atlas Free clusters; do not assume your free cluster includes managed snapshots. Install [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/installation-windows/) and [MongoDB Shell](https://www.mongodb.com/docs/mongodb-shell/install/). Add their executable directories to PATH, then check `mongodump --version`, `mongorestore --version` and `mongosh --version`. Use tools/server versions supported by MongoDB; restore to the same major server version or compatible feature-compatibility version.

Install [7-Zip](https://www.7-zip.org/) for AES-256 encrypted archives. An encrypted password vault such as [KeePassXC](https://keepassxc.org/docs/) can hold the separate recovery material. Both tools can be used without a paid subscription. Use existing storage for an encrypted off-device copy; provider capacity and availability still need checking.

Before the first backup:

1. In Atlas, create a dedicated database user with `read` on the application database for backups. Restrict Network Access to the backup machine's IP. Do not give it write/admin rights. A separate restore user needs write/index-creation permissions on the isolated destination only; it must not have write access to the production database.
2. Choose a private folder outside Git and OneDrive, for example `D:\DiscoverSalah-Backups`. Use Windows folder Security settings to restrict access to the operator and system administrators. The project itself is inside OneDrive: do not leave plaintext dumps or secret copies there.
3. Record the actual `DB_NAME` without printing `.env`. The examples assume `discoversalah`; replace it consistently if yours differs.
4. Record the app release/commit, MongoDB/tool versions, UTC backup time, database name and encryption-key version labels. Labels are identifiers, not the key values.

## What must be recoverable

| Item | Storage and handling |
| --- | --- |
| All application MongoDB collections and indexes | Encrypted database archive, including accounts, venues, proposals, audit, notices, image metadata and deletion ledger |
| Latest cumulative `deletionLedger` | A separately exported, encrypted copy newer than or equal to the chosen data backup; retain while any older backup remains |
| Exact `DATA_KEY` | Private encrypted vault; needed to decrypt contacts, MFA secrets and other encrypted fields |
| Exact `TOKEN_KEY` | Private encrypted vault; used for phone lookup and authentication/tracking hashes; not interchangeable with `DATA_KEY` |
| Backend configuration | Private vault: database credentials, Cloudinary credentials, origins, key version labels and the matching release |
| Admin access | Private vault: contact number, current password, authenticator setup secret/recovery method and only unused recovery codes; mark codes used immediately |
| Vault/archive recovery | Master passwords kept separately from archive media, with a sealed offline emergency copy accessible to the trusted operator |
| Notice poster originals, if recovery is required | Separate controlled image copies; MongoDB holds metadata, not the image bytes |

Do not replace either encryption key during restoration. Key rotation needs a separate migration plan; a fresh random key is not a restore fix. Keep old key versions for every retained backup. Do not put secrets in Git, screenshots, chat, command arguments or an unencrypted cloud folder. After verifying the vault and admin sign-in, remove plaintext local setup copies according to your secure device policy. Database recovery-code hashes cannot reconstruct the original codes.

## Take a consistent backup

For a small free pilot, use a short scheduled maintenance window. Block application writes, stop API instances and workers, and stop other operator jobs. Keep writers stopped until both exports finish. This database-scoped procedure does not use `--oplog`; a dump taken during live writes is not claimed to be a consistent snapshot. MongoDB TTL expiry of temporary authentication records may continue; these records are cleared during restoration anyway.

Create a private `backup-config.yml` outside the repository using an editor. Insert the backup user's real URI/password privately. URL-encode special characters in the username; the password field is a quoted YAML string, not URI text.

```yaml
uri: "mongodb+srv://BACKUP_USER@YOUR_CLUSTER/?authSource=admin&retryWrites=true&w=majority"
password: "YOUR_BACKUP_USER_PASSWORD"
```

The file contains a secret: restrict its Windows permissions and never upload it with the database archive. MongoDB supports `--config` to avoid exposing a password in process arguments.

```powershell
$backupRoot = 'D:\DiscoverSalah-Backups'
$sourceDb = 'discoversalah'
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmssZ')
$batch = Join-Path $backupRoot $stamp
New-Item -ItemType Directory -Path $batch | Out-Null
$configFile = Join-Path $backupRoot 'backup-config.yml'
$archive = Join-Path $batch 'database.archive.gz'
$ledger = Join-Path $batch 'deletion-ledger.archive.gz'

mongodump --config="$configFile" --db="$sourceDb" --gzip --archive="$archive"
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed. Do not label this batch successful.' }
mongodump --config="$configFile" --db="$sourceDb" --collection=deletionLedger --gzip --archive="$ledger"
if ($LASTEXITCODE -ne 0) { throw 'Deletion-ledger backup failed.' }
Get-FileHash -Algorithm SHA256 -LiteralPath $archive,$ledger |
  Export-Csv -NoTypeInformation -Path (Join-Path $batch 'checksums.csv')
```

If no deletion ledger exists yet, explicitly record that it was empty and verify the export result; do not silently treat a failed export as an empty ledger. Record collection counts during the same maintenance window using Atlas's collection view or an authenticated operator shell, and save those counts with the batch. Resume API/worker operation after successful exports.

In 7-Zip File Manager, select the batch folder and choose **Add**: archive format **7z**, encryption **AES-256**, a strong unique password and **Encrypt file names**. Save the encrypted archive outside the batch. Test the archive and extract a copy to a private folder; compare its SHA-256 hashes with the originals. Gzip compression alone is not encryption.

Copy the verified encrypted archive to a second device and an off-device location. Keep its password separately. Remove plaintext working exports only after verification and replication; ordinary file deletion is not guaranteed secure erasure on an SSD. Prefer an encrypted device/volume for the working folder.

Suggested pilot schedule: nightly backup, plus one before releases/data migrations; retain 7 daily and 4 weekly encrypted batches. This is a proposed policy, not an installed scheduled task. A nightly plan can lose up to roughly one day of changes; choose a shorter interval if that is unacceptable. Export and protect the updated cumulative deletion ledger after retention work as well. Monitor failed/missed runs; a sleeping laptop does not make an automatic backup. Keep the latest ledger independently of rolling full-backup retention.

## Restore drill: a fresh isolated destination

Run this before launch, monthly, and after changing backup tooling. A completed export is not proof of recovery.

1. Use an isolated MongoDB replica set or a separate restricted Atlas destination. A second database on a free cluster shares its quota; check capacity first. Name it `discoversalah_restore_20261105` or another new dated name. Verify it is empty. Never point the drill at production and never use `--drop` against production.
2. Retrieve a backup and the latest cumulative deletion-ledger export from the off-device copy. Decrypt privately and verify hashes. If the newest ledger is unavailable, privacy-safe recovery is not verified; investigate before public access.
3. Create a private `restore-config.yml` like the backup config, using a restore-only destination user. Restore everything except the older ledger, then restore the latest ledger. `--nsFrom` and `--nsTo` rename the application namespace. The following examples deliberately omit `--drop` and stop on errors.

```powershell
$restoreConfig = 'D:\DiscoverSalah-Backups\restore-config.yml'
$sourceDb = 'discoversalah'
$restoreDb = 'discoversalah_restore_20261105'
$archive = 'D:\DiscoverSalah-Backups\RESTORED-BATCH\database.archive.gz'
$latestLedger = 'D:\DiscoverSalah-Backups\LATEST-LEDGER\deletion-ledger.archive.gz'
if ($restoreDb -notmatch '^discoversalah_restore_[0-9]+$') { throw 'Use a new isolated restore database.' }

mongorestore --config="$restoreConfig" --gzip --archive="$archive" --nsInclude="$sourceDb.*" --nsExclude="$sourceDb.deletionLedger" --nsFrom="$sourceDb.*" --nsTo="$restoreDb.*" --stopOnError
if ($LASTEXITCODE -ne 0) { throw 'Restore failed. Keep the destination offline.' }
mongorestore --config="$restoreConfig" --gzip --archive="$latestLedger" --nsInclude="$sourceDb.deletionLedger" --nsFrom="$sourceDb.*" --nsTo="$restoreDb.*" --stopOnError
if ($LASTEXITCODE -ne 0) { throw 'Latest deletion-ledger restore failed.' }
```

For a verified empty ledger, omit only the second restore and document that state. Re-running these commands into a partially restored database is not the procedure: use another new empty drill database.

4. Create a private environment file outside the repo, for example `D:\DiscoverSalah-Backups\restore.env`. Include the destination `MONGODB_URI`, `DB_NAME=discoversalah_restore_20261105`, the original `DATA_KEY` and `TOKEN_KEY`, `NODE_ENV=development`, `PORT=4001`, `WEB_ORIGIN=http://127.0.0.1:5173`, and `PHONE_PROVIDER=disabled`. Explicitly include `CLOUDINARY_CLOUD_NAME=`, `CLOUDINARY_API_KEY=`, `CLOUDINARY_API_SECRET=`, `PHONE_PROVIDER_URL=` and `PHONE_PROVIDER_TOKEN=` as empty settings in this file. Do not start a worker or allow outbound production services from the drill.
5. From `backend/`, use the explicit environment file below. Use a new dedicated terminal and clear the listed inherited variables first: pre-existing environment variables take precedence over Node’s `--env-file`. The file then supplies every setting before dotenv reads the default `.env`; dotenv does not override them. Verify the destination name privately first. All operations here target only the restored copy.

```powershell
# Clears variables in this dedicated terminal only, not files or host settings.
$restoreVariables = @('MONGODB_URI','DB_NAME','DATA_KEY','TOKEN_KEY','NODE_ENV','PORT','WEB_ORIGIN','PHONE_PROVIDER','PHONE_PROVIDER_URL','PHONE_PROVIDER_TOKEN','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET')
foreach ($variable in $restoreVariables) {
  Remove-Item -LiteralPath ("Env:" + $variable) -ErrorAction SilentlyContinue
}
node --env-file="D:\DiscoverSalah-Backups\restore.env" dist/scripts/check-db.js
node --env-file="D:\DiscoverSalah-Backups\restore.env" dist/scripts/retention.js --replay-ledger
node --env-file="D:\DiscoverSalah-Backups\restore.env" dist/scripts/retention.js
```

Check each exit code before proceeding. Replaying the latest ledger removes private application data deleted after the older full backup; normal retention then processes anything newly due.

6. Before opening the restored app, connect `mongosh` to the **restore destination**, using its non-secret host/username arguments and an interactive password prompt. Explicitly select the restore database, check `db.getName()`, and run this guarded cleanup. It invalidates old sessions/challenges, clears cached credential command results and prevents spent recovery codes from becoming usable again after rollback.

```javascript
// Run only in mongosh connected to the isolated restore destination.
const restored = db.getSiblingDB('discoversalah_restore_20261105');
if (!/^discoversalah_restore_[0-9]+$/.test(restored.getName())) throw Error('Wrong target');
restored.sessions.deleteMany({});
restored.accessTokens.deleteMany({});
restored.commands.deleteMany({});
restored.accounts.updateMany({}, { $inc: { authVersion: 1 } });
restored.accounts.updateMany({ role: 'admin' }, { $set: { recoveryCodes: [] } });
```

7. Start only the restored API with `node --env-file="D:\DiscoverSalah-Backups\restore.env" dist/src/server.js`. In a separate frontend terminal set `$env:API_PROXY_TARGET='http://127.0.0.1:4001'` and run `npm run dev -- --port 5173 --strictPort`. Stop the normal local frontend first and use a fresh browser profile. Do not change production environment values for this drill.
8. Confirm readiness, counts/indexes, admin sign-in with the authenticator matching that backup, private contact readability, mosque/timetable display, focal/representative scope and a synthetic submission/independent approval in the restored copy. Verify a ledger-redacted application's private content remains absent. Count differences from expired sessions or intentional retention are expected and must be explained. Never print keys or decrypted contacts in the drill report.
9. Record backup ID/hash, restore duration, success/fail for each check, count differences and fixes needed. Stop the isolated API. Retain the encrypted report; delete the drill database only after verifying its exact namespace and completing your review.

## If recovering the actual service after an incident

Keep traffic and workers stopped while restoring into a new database. Apply the latest deletion ledger and the authentication cleanup above before cutover. Reconcile account deactivations, assignments, password changes and notice cancellations made after the snapshot: restoring old state can restore old access. Independently verify admin identity and the current MFA setup. Old recovery codes were intentionally cleared; there is no dashboard regeneration flow, so arrange a controlled operator MFA reprovisioning procedure before relying on backup codes again. A password-only reset preserves MFA and does not regenerate codes.

Do not reopen service until authorized operators have reconciled revoked staff access and reset affected credentials, verified encryption and scopes, checked health, and decided whether pending outbox jobs should be retried. Re-enable the worker and production image credentials only after this review. Keep the original damaged database isolated for investigation and record the cutover database name/release.

MongoDB restoration cannot recreate Cloudinary images that were deleted after the backup. Verify active notice assets separately; keep notices unavailable or arrange a fresh authorized upload/review for missing posters. Do not restart expiry cleanup against production Cloudinary from an unreviewed old database. Do not restore already-expired/private posters to public access merely because a backup contains their metadata.

## Acceptance checklist

- Latest data archive and cumulative deletion ledger are encrypted, readable, hashed and copied off-device.
- Matching key versions and current admin recovery material are recoverable from a separate vault.
- A fresh isolated database restores successfully; latest deletion ledger is replayed.
- Old sessions/tokens/command responses and restored recovery codes cannot grant access.
- Admin MFA, private-field decryption, role scope and independent approval are checked.
- Image-storage recovery limits and backup frequency/data-loss window are understood.
- Owner and trusted operator can repeat the procedure without help from the original development laptop.

Sources checked 5 November 2026: [Atlas backup availability](https://www.mongodb.com/docs/atlas/backup-restore-cluster/), [mongodump options and consistency](https://www.mongodb.com/docs/database-tools/mongodump/), [mongorestore compatibility and namespace mapping](https://www.mongodb.com/docs/database-tools/mongorestore/), [7-Zip encryption](https://www.7-zip.org/), [KeePassXC encrypted vaults](https://keepassxc.org/docs/).
# Timetable policy update — 8 November 2026

Whole-database backups must include `timetableFollowUps`, alongside proposals, notifications and audit history. Follow-up notes and focal correction sources use the existing `DATA_KEY`; keep it with your secure key backups. Restore these records together. Historical `Approved` and new `Published` timetable versions are both valid; do not convert old pending drafts into published records during restoration. See [current timetable policy](TIMETABLE_PUBLISHING.md).

