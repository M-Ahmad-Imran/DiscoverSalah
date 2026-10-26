import { readLocale } from '../services/preferences';
import { ur } from './ur';
let current = readLocale();
export function setTranslationLocale(locale: 'en' | 'ur') {
  current = locale;
}
export function translate(text: string, locale: 'en' | 'ur', explicit?: string): string {
  if (locale !== 'ur') return text;
  if (explicit) return explicit;
  if (ur[text]) return ur[text];
  const prayer = text.match(
    /^(Fajr|Dhuhr|Asr|Maghrib|Isha|Jumu’ah|Eid) (Jama’at|proposed time)$/,
  );
  if (prayer)
    return ur[prayer[1]] + (prayer[2] === 'Jama’at' ? ' کی جماعت' : ' کا مجوزہ وقت');
  const event = text.match(
    /^(Timetable|Registration|Request|Notice|Venue change|Venue status|Assignment) (.+)$/,
  );
  if (event && ur[event[1]] && ur[event[2]]) return ur[event[1]] + ' · ' + ur[event[2]];
  if (text.includes(':'))
    return text
      .split(':')
      .map((part) => ur[part] || part)
      .join(' · ');
  return text;
}
export function currentLocale() {
  return current;
}
export function tr(text: string) {
  return translate(text, current);
}
export function displayDate(value: string | number | Date, withTime = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return withTime
    ? date.toLocaleString(current === 'ur' ? 'ur-PK' : 'en-PK', {
        timeZone: 'Asia/Karachi',
      })
    : date.toLocaleDateString(current === 'ur' ? 'ur-PK' : 'en-PK', {
        timeZone: 'Asia/Karachi',
      });
}
