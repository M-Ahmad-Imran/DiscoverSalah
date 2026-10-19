import { useEffect, useState, type ReactNode } from 'react';
import { identity } from '../../domain/constants';
import {
  readDatabase,
  readLocale,
  readRole,
  saveDatabase,
  savePreference,
} from '../../services/demoStorage';
import { Draft } from '../../types/draft';
import { Database, Role } from '../../types/index';
import { C } from '../context';

export function Provider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(readDatabase);
  const [role, setRole] = useState<Role | null>(readRole);
  const [locale, setLocale] = useState<'en' | 'ur'>(readLocale);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    if (!saveDatabase(db))
      setMessage(
        'Browser storage is unavailable. Changes last only while this page stays open.',
      );
  }, [db]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
    savePreference('ds-locale', locale);
  }, [locale]);
  useEffect(() => {
    if (message) {
      const x = setTimeout(() => setMessage(''), 4500);
      return () => clearTimeout(x);
    }
  }, [message]);
  useEffect(() => {
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener('online', yes);
    window.addEventListener('offline', no);
    return () => {
      window.removeEventListener('online', yes);
      window.removeEventListener('offline', no);
    };
  }, []);
  const login = (r: Role) => {
    setRole(r);
    savePreference('ds-role', r, true);
  };
  const logout = () => {
    setRole(null);
    setDraft(null);
    savePreference('ds-role', null, true);
  };
  return (
    <C.Provider
      value={{
        db,
        update: setDb,
        role,
        actor: role ? identity[role] : 'visitor',
        login,
        logout,
        locale,
        t: (en, ur) => (locale === 'ur' ? ur || en : en),
        toggleLocale: () => setLocale((x) => (x === 'en' ? 'ur' : 'en')),
        toast: setMessage,
        draft,
        setDraft,
        online,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button onClick={() => setMessage('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </C.Provider>
  );
}
