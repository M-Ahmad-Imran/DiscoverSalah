import { Venue } from '../../types/index';

export function status(
  v: Venue,
  under: boolean,
  t: (en: string, ur?: string) => string,
  disputed = false,
) {
  if (disputed)
    return t(
      'Timing disputed — confirm with mosque',
      'اوقات متنازع — مسجد سے تصدیق کریں',
    );
  if (v.status !== 'Published') return t('Maintenance pending', 'دیکھ بھال زیر التوا');
  return under
    ? t('Timing under review', 'اوقات زیر تصدیق')
    : t('Phone verification recorded', 'فون تصدیق درج ہے');
}
