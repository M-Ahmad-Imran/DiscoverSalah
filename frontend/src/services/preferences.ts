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
