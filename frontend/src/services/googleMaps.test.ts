import { describe, expect, it } from 'vitest';
import { googleMapsDirections } from './googleMaps';

const entrance = { lat: 31.5, lng: 74.3, status: 'Published' as const };
describe('external Google Maps directions', () => {
  it('uses the approved entrance without location, credentials or API keys', () => {
    const url = new URL(googleMapsDirections(entrance, 'walking')!);
    expect(url.origin).toBe('https://www.google.com');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      api: '1',
      destination: '31.5,74.3',
      travelmode: 'walking',
    });
  });
  it('requests motorized two-wheelers instead of a car or bicycle route', () => {
    expect(
      new URL(googleMapsDirections(entrance, 'motorcycle')!).searchParams.get(
        'travelmode',
      ),
    ).toBe('two-wheeler');
  });
  it('rejects unpublished venues and invalid coordinates', () => {
    expect(googleMapsDirections({ ...entrance, status: 'Draft' }, 'walking')).toBeNull();
    expect(googleMapsDirections({ ...entrance, lat: NaN }, 'walking')).toBeNull();
    expect(googleMapsDirections({ ...entrance, lng: 181 }, 'walking')).toBeNull();
  });
});
