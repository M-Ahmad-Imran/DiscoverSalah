import { useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
/** Cursors live in the URL, so reloads and browser Back preserve the page. */
export function ScreenPagination() {
  const { db, t, fetching } = useApp();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const previous: string[] = Array.isArray(location.state?.pageCursors)
    ? location.state.pageCursors
    : [];
  const page = db.page;
  if (
    !page ||
    location.pathname === '/' ||
    [
      'dashboard',
      'none',
      'form',
      'venue',
      'proposal',
      'request',
      'account',
      'notice',
    ].includes(page.view)
  )
    return null;
  const first = () => {
    const next = new URLSearchParams(params);
    next.delete('cursor');
    setParams(next);
  };
  return (
    <nav
      className="container pagination row wrap spaced"
      aria-label={t('Pagination', 'صفحات کی تبدیلی')}
    >
      {fetching && <span role="status">{t('Loading…', 'لوڈ ہو رہا ہے…')}</span>}
      <span role="status">
        {page.ids.length} {t('records on this page', 'اس صفحے پر ریکارڈ')}
      </span>
      {page.hasPrevious && (
        <button className="secondary" onClick={first}>
          {t('First page', 'پہلا صفحہ')}
        </button>
      )}
      {page.hasPrevious && previous.length > 0 && (
        <button
          disabled={fetching}
          className="secondary"
          onClick={() => {
            const next = new URLSearchParams(params);
            const cursor = previous[previous.length - 1];
            if (cursor) next.set('cursor', cursor);
            else next.delete('cursor');
            setParams(next, { state: { pageCursors: previous.slice(0, -1) } });
          }}
        >
          {t('Previous page', 'پچھلا صفحہ')}
        </button>
      )}
      <button
        disabled={fetching || !page.nextCursor}
        onClick={() => {
          const next = new URLSearchParams(params);
          next.set('cursor', page.nextCursor!);
          setParams(next, {
            state: { pageCursors: [...previous, params.get('cursor') || ''].slice(-100) },
          });
        }}
      >
        {t('Next page', 'اگلا صفحہ')}
      </button>
    </nav>
  );
}
