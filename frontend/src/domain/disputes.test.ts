import { describe, expect, it } from 'vitest';
import { seed } from '../data/fixtures';
import { isDisputed } from './disputes';

describe('investigated dispute scope', () => {
  it('affects only the investigated prayer and date', () => {
    const v = seed().venues[0];
    v.disputes = [
      {
        id: 'd1',
        prayer: 'Asr',
        date: '2026-10-17',
        reason: 'Conflicting confirmation',
        reportId: 'r1',
        recordedBy: 'focal-1',
      },
    ];
    expect(isDisputed(v, 'Asr', '2026-10-17')).toBe(true);
    expect(isDisputed(v, 'Isha', '2026-10-17')).toBe(false);
    expect(isDisputed(v, 'Asr', '2026-10-18')).toBe(false);
  });
  it('retains resolved history without leaving an active warning', () => {
    const v = seed().venues[0];
    v.disputes = [
      {
        id: 'd1',
        prayer: 'Asr',
        date: '2026-10-17',
        reason: 'Checked evidence',
        reportId: 'r1',
        recordedBy: 'focal-1',
        resolved: true,
      },
    ];
    expect(isDisputed(v, 'Asr', '2026-10-17')).toBe(false);
    expect(v.disputes).toHaveLength(1);
  });
});
