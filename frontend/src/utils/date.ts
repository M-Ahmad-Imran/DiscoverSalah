import { tr } from '../i18n/translate';
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const timeLabel = (time: string) => {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${tr(h < 12 ? 'AM' : 'PM')}`;
};
