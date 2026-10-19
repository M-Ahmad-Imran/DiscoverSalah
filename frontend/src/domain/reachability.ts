export function arrival(
  start: number,
  departure: number,
  route: number,
  preparation: number,
  uncertainty: number,
  eligible: boolean,
) {
  if (!eligible) return 'Unavailable';
  if (departure + route >= start) return 'Unlikely';
  return start - departure - route - preparation - uncertainty >= 0
    ? 'Estimated reachable'
    : 'Time is tight';
}
