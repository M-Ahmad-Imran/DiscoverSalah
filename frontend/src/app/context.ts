import { createContext } from 'react';
import type { SessionAccount } from '../services/api';
import { Draft } from '../types/draft';
import { Database, Role } from '../types/index';

export interface Context {
  db: Database;
  fetching: boolean;
  screenReady: boolean;
  include: (data: Partial<Database>) => void;
  role: Role | null;
  login: (contactNumber: string, password: string) => Promise<SessionAccount | null>;
  account: SessionAccount | null;
  refresh: () => Promise<void>;
  restoreSession: () => Promise<SessionAccount | null>;
  mutate: <T = { id: string }>(path: string, body: unknown) => Promise<T>;
  logout: () => Promise<void>;
  actor: string;
  locale: 'en' | 'ur';
  t: (en: string, ur?: string) => string;
  toggleLocale: () => void;
  toast: (text: string) => void;
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  online: boolean;
}

export const C = createContext<Context>(null!);
