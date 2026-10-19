import type { Database, Role } from '../types';

export interface AssignmentInput {
  operation: 'representative' | 'focal' | 'backup';
  target: string;
  assignee: string;
  reason: string;
  startsAt: string;
  endsAt: string;
}

/** Validate against current records at commit time, not only available form options. */
export function assignmentError(
  db: Database,
  role: Role,
  actor: string,
  input: AssignmentInput,
  now = Date.now(),
) {
  const account = db.accounts.find((a) => a.id === input.assignee && a.active);
  if (!db.accounts.some((a) => a.id === actor && a.active && a.role === role))
    return 'Your account is inactive.';
  if (role !== 'admin' && role !== 'focal') return 'Assignment authority is required.';
  if (input.operation !== 'representative' && role !== 'admin')
    return 'An administrator must assign reviewer coverage.';
  if (
    !account ||
    account.role !== (input.operation === 'representative' ? 'representative' : 'focal')
  )
    return 'Select an active account with the required role.';
  if (input.reason.trim().length < 5) return 'Record a meaningful reason.';
  if (input.operation === 'focal') {
    if (!db.areas.some((a) => a.name === input.target))
      return 'Select a participating area.';
  } else {
    const venue = db.venues.find((v) => v.id === input.target);
    if (!venue || (role === 'focal' && venue.focal !== actor))
      return 'This mosque is outside your assignment scope.';
    if (input.operation === 'backup') {
      const start = Date.parse(input.startsAt),
        end = Date.parse(input.endsAt);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now)
        return 'Choose a valid coverage window ending after its start and after now.';
      if (venue.focal === input.assignee)
        return 'Choose a reviewer other than the primary Focal Person.';
    }
  }
  return null;
}

export function applyAssignment(
  db: Database,
  role: Role,
  actor: string,
  input: AssignmentInput,
  auditId: string,
  now = Date.now(),
): Database {
  const error = assignmentError(db, role, actor, input, now);
  if (error) throw new Error(error);
  return {
    ...db,
    venues: db.venues.map((v) => {
      if (input.operation === 'focal' && v.area === input.target)
        return { ...v, focal: input.assignee };
      if (v.id !== input.target) return v;
      if (input.operation === 'representative') return { ...v, rep: input.assignee };
      if (input.operation === 'backup')
        return {
          ...v,
          backup: {
            reviewer: input.assignee,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            reason: input.reason.trim(),
            assignedBy: actor,
          },
        };
      return v;
    }),
    areas: db.areas.map((a) =>
      input.operation === 'focal' && a.name === input.target
        ? { ...a, focal: input.assignee }
        : a,
    ),
    audit: [
      {
        id: auditId,
        actor,
        at: new Date(now).toISOString(),
        target: input.target,
        action: `${input.operation} assignment → ${input.assignee} · ${input.reason.trim()}${input.operation === 'backup' ? ` · ${input.startsAt}–${input.endsAt}` : ''}`,
      },
      ...db.audit,
    ],
  };
}
