import type { Venue } from '../types';

/** Destination only: precise visitor location never enters an outbound URL. */
export function googleMapsDirections(
  venue: Pick<Venue, 'lat' | 'lng' | 'status'>,
  mode: string,
): string | null {
  if (
    !['Published', 'Maintenance pending'].includes(venue.status) ||
    !Number.isFinite(venue.lat) ||
    Math.abs(venue.lat) > 90 ||
    !Number.isFinite(venue.lng) ||
    Math.abs(venue.lng) > 180
  )
    return null;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${venue.lat},${venue.lng}`);
  // Maps URLs support motorized two-wheelers; bicycling is not motorcycle travel.
  url.searchParams.set('travelmode', mode === 'motorcycle' ? 'two-wheeler' : 'walking');
  return url.toString();
}
