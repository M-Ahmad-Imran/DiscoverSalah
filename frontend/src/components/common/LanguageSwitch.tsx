import { Globe } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

export function LocaleButton() {
  const { t, toggleLocale, locale } = useApp();
  return (
    <button
      className="locale"
      onClick={toggleLocale}
      lang={locale === 'en' ? 'ur' : 'en'}
      title={locale === 'en' ? 'اردو میں دیکھیں' : 'View in English'}
    >
      <Globe size={17} />
      {t('اردو', 'English')}
    </button>
  );
}
