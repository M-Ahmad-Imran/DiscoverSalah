import { canManage, canViewVenue } from '../domain/permissions';
import { useApp } from './useApp';

export function useScopedVenues(includeBackupReviews = false) {
  const { db, role, actor } = useApp();
  return db.venues.filter(
    (v) =>
      role &&
      (includeBackupReviews ? canViewVenue(role, v, actor) : canManage(role, v, actor)),
  );
}
