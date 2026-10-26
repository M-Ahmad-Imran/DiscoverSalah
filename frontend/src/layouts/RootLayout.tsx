import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../hooks/useApp';

export function Root() {
  const { t, online } = useApp();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title =
      'DiscoverSalah · ' +
      (pathname === '/'
        ? 'Find your congregation'
        : pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' '));
  }, [pathname]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('Skip to content', 'مواد پر جائیں')}
      </a>
      <div className="demo-strip">
        {t('LOCAL WORKSPACE', 'مقامی ورک اسپیس')}
        <span>
          {t(
            'Connected database · Route estimates unavailable',
            'ڈیٹابیس منسلک · راستے کا تخمینہ دستیاب نہیں',
          )}
        </span>
      </div>
      {!online && (
        <div className="offline" role="status">
          {t(
            'You are offline. Saved content may be outdated. Live arrival estimates are unavailable.',
            'آپ آف لائن ہیں۔ محفوظ معلومات پرانی ہو سکتی ہیں۔',
          )}
        </div>
      )}
      <Outlet />
    </>
  );
}
