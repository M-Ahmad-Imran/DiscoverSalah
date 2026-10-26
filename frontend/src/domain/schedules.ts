import { Proposal, Times, Venue } from '../types/index';
import { daily } from './constants';

export function resolveTimes(v: Venue, proposals: Proposal[], date: string) {
  return effectiveProposal(v, proposals, date)?.times ?? v.times;
}

export function effectiveProposal(v: Venue, proposals: Proposal[], date: string) {
  return [...proposals]
    .filter((p) => p.venueId === v.id && p.state === 'Approved' && p.effective <= date)
    .sort((a, b) => b.effective.localeCompare(a.effective) || b.version - a.version)[0];
}

export function resolveSpecial(v: Venue, proposals: Proposal[], date: string) {
  return effectiveProposal(v, proposals, date)?.special ?? v.special;
}

/** Dated entries override the daily schedule only on their exact date. */
export function sessionsFor(
  v: Venue,
  proposals: Proposal[],
  prayer: string,
  date: string,
) {
  if (
    v.initialEffective &&
    date < v.initialEffective &&
    !effectiveProposal(v, proposals, date)
  )
    return [];
  const dated = resolveSpecial(v, proposals, date).filter(
    (s) => s.date === date && s.prayer === prayer,
  );
  if (dated.length) return dated.filter((s) => !s.canceled);
  if (prayer === 'Dhuhr' && new Date(date + 'T12:00:00+05:00').getUTCDay() === 5)
    return [];
  const time = resolveTimes(v, proposals, date)[prayer];
  return time
    ? [
        {
          id: 'daily',
          prayer,
          date,
          time,
          khutbah: '',
          provisional: false,
          canceled: false,
        },
      ]
    : [];
}

export function pendingPrayer(
  v: Venue,
  proposals: Proposal[],
  prayer: string,
  date: string,
) {
  if (
    v.pendingScopes?.some(
      (scope) =>
        scope.effective <= date &&
        (scope.prayers.includes(prayer) ||
          scope.dated.some((s) => s.prayer === prayer && s.date === date)),
    )
  )
    return true;
  return proposals.some(
    (p) =>
      p.venueId === v.id &&
      p.state === 'Submitted' &&
      p.effective <= date &&
      (p.times[prayer] !== p.before[prayer] ||
        JSON.stringify(
          p.special.filter((s) => s.prayer === prayer && s.date === date),
        ) !==
          JSON.stringify(
            (p.beforeSpecial ?? v.special).filter(
              (s) => s.prayer === prayer && s.date === date,
            ),
          )),
  );
}

export function validateTimes(times: Times) {
  return daily.every((p) => /^([01]\d|2[0-3]):[0-5]\d$/.test(times[p] || ''));
}
