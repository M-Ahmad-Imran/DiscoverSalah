import { describe, expect, it } from 'vitest';
import { seed } from '../data/fixtures';
import { canManage, canReview } from './permissions';
import { arrival } from './reachability';
import { pendingPrayer, resolveTimes, sessionsFor, validateTimes } from './schedules';

describe('dated session consistency', () => {
  it('does not repeat a dated Friday session in another week', () => {
    const d = seed();
    const v = {
      ...d.venues[0],
      special: [
        {
          id: 'fri',
          prayer: 'Jumu’ah',
          date: '2026-10-16',
          time: '13:30',
          khutbah: '13:00',
          provisional: false,
          canceled: false,
        },
      ],
    };
    expect(sessionsFor(v, [], 'Jumu’ah', '2026-10-23')).toEqual([]);
    expect(sessionsFor(v, [], 'Jumu’ah', '2026-10-16')[0].khutbah).toBe('13:00');
  });
  it('does not fall back to daily time after a dated cancellation', () => {
    const d = seed();
    const v = {
      ...d.venues[0],
      special: [
        {
          id: 'cancel',
          prayer: 'Asr',
          date: '2026-10-16',
          time: '16:30',
          khutbah: '',
          provisional: false,
          canceled: true,
        },
      ],
    };
    expect(sessionsFor(v, [], 'Asr', '2026-10-16')).toEqual([]);
    expect(sessionsFor(v, [], 'Asr', '2026-10-17')[0].time).toBe(v.times.Asr);
  });
});
describe('arrival eligibility and exact boundaries', () => {
  it('accepts zero buffered margin', () =>
    expect(arrival(30, 0, 20, 5, 5, true)).toBe('Estimated reachable'));
  it('marks insufficient preparation margin tight', () =>
    expect(arrival(30, 0, 21, 5, 5, true)).toBe('Time is tight'));
  it('marks raw arrival at the start unlikely', () =>
    expect(arrival(30, 0, 30, 5, 5, true)).toBe('Unlikely'));
  it('never makes ineligible timings reachable', () =>
    expect(arrival(30, 0, 1, 0, 0, false)).toBe('Unavailable'));
});
describe('scope, proposal and effective date policies', () => {
  it('denies self approval even for admin', () => {
    const d = seed();
    expect(canReview(d.proposals[0], 'admin', 'rep-1', d.venues[0])).toBe(false);
  });
  it('denies a superseded or stale review', () => {
    const d = seed(),
      p = d.proposals[0],
      v = d.venues[0];
    expect(canReview({ ...p, state: 'Superseded' }, 'focal', 'focal-1', v)).toBe(false);
    expect(canReview({ ...p, baseRevision: 0 }, 'focal', 'focal-1', v)).toBe(false);
  });
  it('permits an independent assigned reviewer', () => {
    const d = seed();
    expect(canReview(d.proposals[0], 'focal', 'focal-1', d.venues[0])).toBe(true);
  });
  it('denies unassigned representative access', () =>
    expect(canManage('representative', seed().venues[0], 'rep-2')).toBe(false));
  it('only suppresses the affected prayer after the effective date', () => {
    const d = seed();
    const p = { ...d.proposals[0], effective: '2027-01-01' };
    expect(pendingPrayer(d.venues[0], [p], 'Asr', '2027-01-01')).toBe(true);
    expect(pendingPrayer(d.venues[0], [p], 'Maghrib', '2027-01-01')).toBe(false);
    expect(pendingPrayer(d.venues[0], [p], 'Asr', '2026-12-31')).toBe(false);
  });
  it('does not activate approved future times early', () => {
    const d = seed();
    const p = { ...d.proposals[0], state: 'Approved', effective: '2027-01-01' };
    expect(resolveTimes(d.venues[0], [p], '2026-12-31').Asr).toBe('16:15');
    expect(resolveTimes(d.venues[0], [p], '2027-01-01').Asr).toBe('16:30');
  });
  it('rejects invalid and incomplete daily times', () => {
    const t = seed().venues[0].times;
    expect(validateTimes(t)).toBe(true);
    expect(validateTimes({ ...t, Asr: '25:90' })).toBe(false);
    expect(validateTimes({ ...t, Fajr: '' })).toBe(false);
  });
});
