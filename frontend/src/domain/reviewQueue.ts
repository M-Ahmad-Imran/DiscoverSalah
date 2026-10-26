import type { Database, Role } from '../types';
import { canAccessRequest, canManage, canViewVenue } from './permissions';
export interface ReviewItem {
  id: string;
  type: string;
  venueId: string;
  title: string;
  href: string;
  created: string;
  due: string;
  urgent: boolean;
}
export function reviewItems(db: Database, role: Role, actor: string): ReviewItem[] {
  if (role === 'representative') return [];
  const scoped = (id: string) =>
    db.venues.some((v) => v.id === id && canManage(role, v, actor));
  const items: ReviewItem[] = db.proposals
    .filter(
      (p) =>
        p.state === 'Submitted' &&
        db.venues.some((v) => v.id === p.venueId && canViewVenue(role, v, actor)),
    )
    .map((p) => ({
      id: p.id,
      type: 'Timetable',
      venueId: p.venueId,
      title: db.venues.find((v) => v.id === p.venueId)?.name || p.id,
      href: '/manage/review/' + p.id,
      created: p.created,
      due: p.effective,
      urgent:
        !!p.escalated ||
        db.audit.some(
          (a) => a.action.startsWith('Escalation') && a.action.includes(p.id),
        ),
    }));
  for (const r of db.requests) {
    if (
      !['Submitted', 'Open', 'In review', 'Awaiting checks', 'Escalated'].includes(
        r.status,
      )
    )
      continue;
    if (!canAccessRequest(db, role, actor, r)) continue;
    items.push({
      id: r.id,
      type: r.kind,
      venueId: r.values.venue || '',
      title: r.title,
      href: '/manage/requests/' + r.id,
      created: r.created,
      due: '',
      urgent: r.status === 'Escalated',
    });
  }
  for (const n of db.notices.filter((n) => n.state === 'Submitted' && scoped(n.venueId)))
    items.push({
      id: n.id,
      type: 'Notice',
      venueId: n.venueId,
      title: n.title,
      href: '/manage/notices?notice=' + n.id,
      created: '',
      due: n.event.slice(0, 10),
      urgent: false,
    });
  return items.sort(
    (a, b) => Number(b.urgent) - Number(a.urgent) || a.due.localeCompare(b.due),
  );
}
