import { Outlet } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { ScreenPagination } from './ScreenPagination';

/** Keep navigation and its guidance mounted while the destination data loads. */
export function ScreenContent() {
  const { screenReady, t } = useApp();
  if (!screenReady) return <p role="status">{t('Loading…', 'لوڈ ہو رہا ہے…')}</p>;
  return (
    <>
      <Outlet />
      <ScreenPagination />
    </>
  );
}
