import { Globe } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

export function LocaleButton() {
  const { t, toggleLocale } = useApp();
  return (
    <button className="locale" onClick={toggleLocale}>
      <Globe size={17} />
      {t('اردو', 'English')}
    </button>
  );
}
