import { describe, expect, it } from 'vitest';
import { seed } from '../data/fixtures';
import { applyAssignment, assignmentError, type AssignmentInput } from './assignments';
import { canManage, canReview, hasActiveBackup } from './permissions';

const now = Date.parse('2026-10-17T10:00:00+05:00');
function setup() {
  const db = seed();
  db.accounts.push({
    id: 'backup-1',
    name: 'Sample backup',
    role: 'focal',
    area: 'Model Town',
    active: true,
    status: 'Active',
  });
  const input: AssignmentInput = {
    operation: 'backup',
    target: db.venues[0].id,
    assignee: 'backup-1',
    reason: 'Primary reviewer unavailable',
    startsAt: '2026-10-17T09:00:00+05:00',
    endsAt: '2026-10-17T11:00:00+05:00',
  };
  return { db, input };
}
describe('assignment and backup policy', () => {
  it('persists the coverage window without changing the primary assignment or publication', () => {
    const { db, input } = setup();
    const result = applyAssignment(db, 'admin', 'admin-1', input, 'audit-test', now);
    expect(result.venues[0].backup?.endsAt).toBe(input.endsAt);
    expect(result.venues[0].focal).toBe(db.venues[0].focal);
    expect(result.venues[0].status).toBe(db.venues[0].status);
    expect(db.venues[0].backup).toBeUndefined();
  });
  it('allows review only within the coverage window, without general management access', () => {
    const { db, input } = setup();
    const v = applyAssignment(db, 'admin', 'admin-1', input, 'a', now).venues[0];
    expect(canReview(db.proposals[0], 'focal', 'backup-1', v, now)).toBe(true);
    expect(canManage('focal', v, 'backup-1')).toBe(false);
    expect(hasActiveBackup(v, 'backup-1', Date.parse(input.startsAt) - 1)).toBe(false);
    expect(hasActiveBackup(v, 'backup-1', Date.parse(input.endsAt))).toBe(false);
    expect(
      canReview({ ...db.proposals[0], author: 'backup-1' }, 'focal', 'backup-1', v, now),
    ).toBe(false);
  });
  it('rejects inactive assignees, unauthorized delegation and invalid windows', () => {
    const { db, input } = setup();
    expect(assignmentError(db, 'focal', 'focal-1', input, now)).toBeTruthy();
    expect(
      assignmentError(db, 'admin', 'admin-1', { ...input, endsAt: input.startsAt }, now),
    ).toBeTruthy();
    db.accounts.find((a) => a.id === 'backup-1')!.active = false;
    expect(assignmentError(db, 'admin', 'admin-1', input, now)).toBeTruthy();
  });
  it('does not publish a suspended venue when replacing its representative', () => {
    const { db, input } = setup();
    db.venues[0].status = 'Suspended';
    const result = applyAssignment(
      db,
      'admin',
      'admin-1',
      { ...input, operation: 'representative', assignee: 'rep-1' },
      'a',
      now,
    );
    expect(result.venues[0].status).toBe('Suspended');
  });
});
