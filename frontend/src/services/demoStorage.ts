import { seed } from '../data/fixtures';
import type { Database, Role } from '../types';

const DATABASE_KEY = 'ds-demo-v1';

// This adapter is intentionally local. Replace it with an authenticated API repository
// before accepting real contacts, approvals or timetable data.
export function readDatabase(): Database {
  try {
    const value = JSON.parse(localStorage.getItem(DATABASE_KEY) || 'null');
    const collections = [
      'venues',
      'proposals',
      'requests',
      'notices',
      'accounts',
      'notifications',
      'audit',
      'areas',
    ];
    if (value && collections.every((key) => Array.isArray(value[key]))) return value;
  } catch {
    /* Unavailable or malformed browser storage falls back to sample data. */
  }
  return seed();
}

export function saveDatabase(value: Database): boolean {
  try {
    localStorage.setItem(DATABASE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readRole(): Role | null {
  try {
    const value = sessionStorage.getItem('ds-role');
    return value === 'representative' || value === 'focal' || value === 'admin'
      ? value
      : null;
  } catch {
    return null;
  }
}

export function readLocale(): 'en' | 'ur' {
  try {
    return localStorage.getItem('ds-locale') === 'ur' ? 'ur' : 'en';
  } catch {
    return 'en';
  }
}

export function savePreference(key: string, value: string | null, session = false) {
  try {
    const storage = session ? sessionStorage : localStorage;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    /* Preferences remain usable in memory when persistence is unavailable. */
  }
}
