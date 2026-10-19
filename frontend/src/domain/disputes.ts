import type { Venue } from '../types';

export function isDisputed(venue: Venue, prayer: string, date: string) {
  return (
    venue.disputes?.some((d) => !d.resolved && d.prayer === prayer && d.date === date) ??
    false
  );
}
