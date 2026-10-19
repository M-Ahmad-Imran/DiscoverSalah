import { deliveryFixtures } from '../data/deliveryFixtures';
import type { Database } from '../types';
export function updateDelivery(
  db: Database,
  id: string,
  action: 'retry' | 'escalate',
  actor: string,
  at: string,
): Database {
  if (!db.accounts.some((a) => a.id === actor && a.active && a.role === 'admin'))
    throw new Error('Administrator access required');
  const jobs = db.deliveryJobs ?? deliveryFixtures;
  const job = jobs.find((j) => j.id === id);
  if (!job || (job.state === 'Retry queued' && action === 'retry')) return db;
  return {
    ...db,
    deliveryJobs: jobs.map((j) =>
      j.id === id
        ? {
            ...j,
            state: action === 'retry' ? 'Retry queued' : 'Escalated',
            history: [
              ...j.history,
              at +
                ' · ' +
                (action === 'retry'
                  ? 'Retry requested; awaiting worker'
                  : 'Escalated to service operator'),
            ],
          }
        : j,
    ),
    audit: [
      {
        id: 'delivery-' + id + '-' + at,
        actor,
        target: id,
        at,
        action: 'Notification ' + action + ' requested',
      },
      ...db.audit,
    ],
  };
}
