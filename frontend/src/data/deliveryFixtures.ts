import type { DeliveryJob } from '../types';
export const deliveryFixtures: DeliveryJob[] = [
  {
    id: 'OUTBOX-DEMO-1',
    target: 'DS-1001',
    state: 'Failed',
    error: 'Sample provider timeout. No external message was sent.',
    attempts: 1,
    history: ['Sample delivery attempt failed'],
  },
];
