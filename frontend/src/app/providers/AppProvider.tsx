import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { setTranslationLocale, tr, translate } from '../../i18n/translate';
import {
  api,
  ApiError,
  setChallenge,
  setCsrf,
  type SessionAccount,
} from '../../services/api';
import { readLocale, savePreference } from '../../services/preferences';
import { screenRequest } from '../../services/screenRequest';
import { Draft } from '../../types/draft';
import { Database } from '../../types/index';
import { C } from '../context';
const empty: Database = {
  venues: [],
  proposals: [],
  requests: [],
  notices: [],
  accounts: [],
  notifications: [],
  audit: [],
  areas: [],
};
export function Provider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const request = screenRequest(location.pathname, location.search);
  const requestKey = request.url;
  const latestKey = useRef(requestKey);
  latestKey.current = requestKey;
  const generation = useRef(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [loadedPath, setLoadedPath] = useState('');
  const [db, setDb] = useState<Database>(empty),
    [account, setAccount] = useState<SessionAccount | null>(null);
  const session = useRef<SessionAccount | null>(null),
    mutating = useRef(false);
  const [loading, setLoading] = useState(true),
    [failure, setFailure] = useState(''),
    [message, setMessage] = useState('');
  const [locale, setLocale] = useState<'en' | 'ur'>(readLocale),
    [draft, setDraft] = useState<Draft | null>(null),
    [online, setOnline] = useState(navigator.onLine);
  setTranslationLocale(locale);
  const refresh = useCallback(async () => {
    if (session.current?.mustChangePassword) {
      setDb(empty);
      setLoadedKey(requestKey);
      setLoadedPath(location.pathname);
      return;
    }
    if (request.protectedView && !session.current) {
      setDb(empty);
      setLoadedKey(requestKey);
      setLoadedPath(location.pathname);
      return;
    }
    const ticket = ++generation.current;
    const data = await api<Database>(requestKey);
    if (ticket !== generation.current || latestKey.current !== requestKey) return;
    setDb(data);
    setLoadedKey(requestKey);
    setLoadedPath(location.pathname);
    setFailure('');
  }, [requestKey, request.protectedView, location.pathname]);
  const restoreSession = useCallback(async () => {
    try {
      const result = await api<{ account: SessionAccount }>('/session');
      session.current = result.account;
      setAccount(result.account);
      return result.account;
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        session.current = null;
        setAccount(null);
        setDb(empty);
        setCsrf('');
        return null;
      }
      throw error;
    }
  }, []);
  useEffect(() => {
    void restoreSession()
      .catch((e) => setFailure(e.message))
      .finally(() => setLoading(false));
  }, [restoreSession]);
  useEffect(() => {
    if (loading) return;
    void refresh().catch((e) => {
      if (latestKey.current !== requestKey) return;
      setFailure(e.message);
      setDb(empty);
      setLoadedKey(requestKey);
      setLoadedPath(location.pathname);
    });
  }, [loading, refresh, requestKey, location.pathname]);
  useEffect(() => {
    let pending = false;
    const revalidate = async () => {
      if (pending || document.hidden || mutating.current) return;
      pending = true;
      try {
        await restoreSession();
        await refresh();
      } catch (e) {
        setFailure((e as Error).message);
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(() => void revalidate(), 30000);
    window.addEventListener('focus', revalidate);
    window.addEventListener('online', revalidate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', revalidate);
      window.removeEventListener('online', revalidate);
    };
  }, [refresh, restoreSession]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
    savePreference('ds-locale', locale);
  }, [locale]);
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
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  async function login(contactNumber: string, password: string) {
    const result = await api<{
      account?: SessionAccount;
      mfaRequired?: boolean;
      challenge?: string;
    }>('/auth/sign-in', { contactNumber, password });
    if (result.mfaRequired) {
      setChallenge(result.challenge!);
      return null;
    }
    session.current = result.account!;
    setAccount(result.account!);
    await refresh();
    return result.account!;
  }
  async function logout() {
    await api('/auth/sign-out', {});
    session.current = null;
    setAccount(null);
    setCsrf('');
    setDraft(null);
    setDb(empty);
    await refresh();
  }
  async function mutate<T = { id: string }>(path: string, body: unknown): Promise<T> {
    if (mutating.current) throw new Error('An action is already being saved.');
    mutating.current = true;
    try {
      const result = await api<T>(path, body);
      try {
        await refresh();
      } catch {
        setFailure(
          'Saved successfully, but the refreshed view could not be loaded. Reload before another action.',
        );
      }
      return result;
    } catch (e) {
      setMessage((e as Error).message);
      if (e instanceof ApiError && (e.status === 401 || e.code === 'ACCESS_REVOKED')) {
        session.current = null;
        setAccount(null);
        setDb(empty);
        setCsrf('');
      }
      throw e;
    } finally {
      mutating.current = false;
    }
  }
  if (loading)
    return (
      <div className="container narrow" role="status">
        {tr('Loading…')}{' '}
      </div>
    );
  return (
    <C.Provider
      value={{
        db,
        fetching: loadedKey !== requestKey,
        screenReady: loadedPath === location.pathname,
        include: (data) =>
          setDb((current) => {
            const next = { ...current };
            const merge = <T extends { id?: string; name: string }>(
              current: T[],
              incoming: T[],
            ) =>
              [
                ...new Map(
                  [...current, ...incoming].map((row) => [row.id || row.name, row]),
                ).values(),
              ].slice(-150);
            next.venues = merge(current.venues, data.venues || []);
            next.accounts = merge(current.accounts, data.accounts || []);
            next.areas = merge(current.areas, data.areas || []);
            return next;
          }),
        account,
        role: account?.role || null,
        actor: account?.id || 'visitor',
        login,
        logout,
        refresh,
        restoreSession,
        mutate,
        locale,
        t: (en, ur) => translate(en, locale, ur),
        toggleLocale: () => setLocale((x) => (x === 'en' ? 'ur' : 'en')),
        toast: setMessage,
        draft,
        setDraft,
        online,
      }}
    >
      {failure && (
        <div className="container" role="alert">
          {tr(failure)}{' '}
          <button
            onClick={() => {
              void refresh().catch((e) => setFailure(e.message));
            }}
          >
            {tr('Retry loading')}{' '}
          </button>
        </div>
      )}
      {children}
      {message && (
        <div className="toast" role="alert">
          {tr(message)}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}
    </C.Provider>
  );
}
