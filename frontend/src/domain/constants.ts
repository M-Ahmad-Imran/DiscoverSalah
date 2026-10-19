import { Prayer, Role } from '../types/index';

export const prayers: Prayer[] = [
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
  'Jumu’ah',
  'Eid',
];

export const daily = prayers.slice(0, 5);

export const roleNames: Record<Role, string> = {
  representative: 'Local Representative',
  focal: 'Focal Person',
  admin: 'System Admin',
};

export const identity: Record<Role, string> = {
  representative: 'rep-1',
  focal: 'focal-1',
  admin: 'admin-1',
};
