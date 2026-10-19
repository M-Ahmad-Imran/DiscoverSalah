import { createContext } from 'react';
import { Draft } from '../types/draft';
import { Database, Role } from '../types/index';

export interface Context {
  db: Database;
  update: (fn: (d: Database) => Database) => void;
  role: Role | null;
  login: (r: Role) => void;
  logout: () => void;
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
