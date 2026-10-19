import { Database, Proposal, RequestRecord, Role, Venue } from '../types/index';

export function canManage(role: Role, venue: Venue, actor: string) {
  return (
    role === 'admin' ||
    (role === 'representative' ? venue.rep === actor : venue.focal === actor)
  );
}

export function hasActiveBackup(venue: Venue, actor: string, now = Date.now()) {
  const backup = venue.backup;
  return (
    !!backup &&
    backup.reviewer === actor &&
    Date.parse(backup.startsAt) <= now &&
    now < Date.parse(backup.endsAt)
  );
}

export function canViewVenue(role: Role, venue: Venue, actor: string, now = Date.now()) {
  return (
    canManage(role, venue, actor) ||
    (role === 'focal' && hasActiveBackup(venue, actor, now))
  );
}

export function canReview(
  p: Proposal,
  role: Role,
  actor: string,
  venue: Venue,
  now = Date.now(),
) {
  return (
    p.state === 'Submitted' &&
    p.author !== actor &&
    (role === 'admin' || role === 'focal') &&
    canViewVenue(role, venue, actor, now) &&
    p.baseRevision === venue.revision
  );
}

export function allowed(role: string | null, kind: string) {
  return role === 'admin' || (role === 'focal' && kind !== 'admin');
}

/** Request access is shared by queue and detail routes; missing venue never grants access. */
export function canAccessRequest(
  db: Database,
  role: Role | null,
  actor: string,
  request: RequestRecord,
) {
  if (!role) return false;
  if (role === 'admin') return true;
  if (
    request.kind === 'application' ||
    (role === 'representative' && request.kind !== 'report')
  )
    return false;
  if (request.values.venue)
    return db.venues.some(
      (v) => v.id === request.values.venue && canManage(role, v, actor),
    );
  return (
    role === 'focal' &&
    db.areas.some((a) => a.name === request.values.area && a.focal === actor)
  );
}
