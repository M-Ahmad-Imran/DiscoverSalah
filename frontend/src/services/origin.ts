let current: { lat: number; lng: number } | null = null;
export function setOrigin(value: { lat: number; lng: number } | null) {
  current = value;
}
export function getOrigin() {
  return current;
}
export function distanceKm(lat: number, lng: number) {
  if (!current) return Infinity;
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat - current.lat) * rad) / 2) ** 2 +
    Math.cos(lat * rad) *
      Math.cos(current.lat * rad) *
      Math.sin(((lng - current.lng) * rad) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
