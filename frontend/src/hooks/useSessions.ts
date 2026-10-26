import { useEffect, useState } from 'react';
import { sessionsFor } from '../domain/schedules';
import { distanceKm } from '../services/origin';
import { useApp } from './useApp';
import { useQuery } from './useDiscoveryQuery';

export function useSessions() {
  const { db } = useApp();
  const { query } = useQuery();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  if (db.discoverySessions && db.page?.view === 'discovery') {
    return db.discoverySessions.flatMap((s) => {
      const venue = db.venues.find((v) => v.id === s.venueId);
      return venue && new Date(`${query.date}T${s.time}:00+05:00`).getTime() > now
        ? [{ ...s, venue }]
        : [];
    });
  }
  return db.venues
    .map((v) => ({ ...v, distance: distanceKm(v.lat, v.lng) }))
    .filter(
      (v) =>
        ['Published', 'Maintenance pending'].includes(v.status) &&
        (query.scope === 'city'
          ? v.city === (query.city || db.areas[0]?.city)
          : v.distance <= Number(query.radius)) &&
        (!query.area || v.area === query.area),
    )
    .flatMap((v) => {
      const choices = sessionsFor(v, db.proposals, query.prayer, query.date);
      return choices
        .filter((s) => new Date(`${query.date}T${s.time}:00+05:00`).getTime() > now)
        .map((s) => ({ venue: v, ...s }));
    })
    .sort((a, b) =>
      query.sort === 'name'
        ? a.venue.name.localeCompare(b.venue.name)
        : a.time.localeCompare(b.time),
    );
}
