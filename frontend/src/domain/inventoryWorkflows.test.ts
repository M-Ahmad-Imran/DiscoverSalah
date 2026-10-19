import { describe, expect, it } from 'vitest';
import { seed } from '../data/fixtures';
import { updateDelivery } from './delivery';
import { noticeState } from './notices';
import { canAccessRequest } from './permissions';
import { reviewItems } from './reviewQueue';
import { pendingPrayer } from './schedules';

describe('inventory workflow boundaries', () => {
  it('does not expose unassigned requests through queue or direct detail access', () => {
    const db = seed();
    const request = {
      ...db.requests[0],
      kind: 'suggestion',
      status: 'Submitted',
      values: { area: 'Unassigned area' },
    };
    db.requests = [request];
    expect(canAccessRequest(db, 'focal', 'focal-1', request)).toBe(false);
    expect(canAccessRequest(db, 'representative', 'rep-1', request)).toBe(false);
    expect(reviewItems(db, 'focal', 'focal-1').some((x) => x.id === request.id)).toBe(
      false,
    );
    expect(canAccessRequest(db, 'admin', 'admin-1', request)).toBe(true);
  });
  it('combines notice and timetable tasks without giving representatives review authority', () => {
    const db = seed();
    db.notices[0].state = 'Submitted';
    expect(reviewItems(db, 'focal', 'focal-1').map((x) => x.type)).toEqual(
      expect.arrayContaining(['Timetable', 'Notice']),
    );
    expect(reviewItems(db, 'representative', 'rep-1')).toEqual([]);
  });
  it('queues a retry once without changing an approval or fabricating delivery success', () => {
    const db = seed();
    const next = updateDelivery(
      db,
      'OUTBOX-DEMO-1',
      'retry',
      'admin-1',
      '2026-10-17T12:00:00Z',
    );
    expect(next.deliveryJobs?.[0].state).toBe('Retry queued');
    expect(next.proposals).toBe(db.proposals);
    expect(
      updateDelivery(next, 'OUTBOX-DEMO-1', 'retry', 'admin-1', '2026-10-17T12:01:00Z'),
    ).toBe(next);
    expect(() =>
      updateDelivery(db, 'OUTBOX-DEMO-1', 'retry', 'rep-1', '2026-10-17T12:00:00Z'),
    ).toThrow();
  });
  it('expires published notices at the exact Pakistan-time boundary', () => {
    const notice = { ...seed().notices[0], expires: '2026-10-17T18:00' };
    expect(noticeState(notice, Date.parse('2026-10-17T12:59:59Z'))).toBe('Published');
    expect(noticeState(notice, Date.parse('2026-10-17T13:00:00Z'))).toBe('Expired');
    expect(
      noticeState({ ...notice, state: 'Draft' }, Date.parse('2026-10-18T13:00:00Z')),
    ).toBe('Draft');
  });
  it('marks a dated cancellation pending only for its prayer and date', () => {
    const db = seed(),
      v = db.venues[0];
    const p = {
      ...db.proposals[0],
      times: { ...v.times },
      before: { ...v.times },
      effective: '2026-10-17',
      beforeSpecial: [],
      special: [
        {
          id: 'cancel',
          prayer: 'Asr',
          date: '2026-10-18',
          time: '16:15',
          khutbah: '',
          provisional: false,
          canceled: true,
        },
      ],
    };
    expect(pendingPrayer(v, [p], 'Asr', '2026-10-18')).toBe(true);
    expect(pendingPrayer(v, [p], 'Asr', '2026-10-19')).toBe(false);
    expect(pendingPrayer(v, [p], 'Fajr', '2026-10-18')).toBe(false);
  });
});
