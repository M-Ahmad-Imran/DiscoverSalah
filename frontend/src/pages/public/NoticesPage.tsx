import { Link } from 'react-router-dom';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { NoticeImage } from '../../components/ui/NoticeImage';
import { noticeState } from '../../domain/notices';
import { useNow } from '../../hooks/useNow';
import { useApp } from '../../hooks/useApp';
import { displayDate } from '../../i18n/translate';

export function PublicNotices() {
  const { db, t } = useApp();
  const now = useNow();
  const notices = db.notices.filter((n) => noticeState(n, now) === 'Published');
  return (
    <div className="container narrow">
      <PageTitle title={t('Active notices', 'فعال اعلانات')} />
      {notices.map((notice) => (
        <Link className="list-row" key={notice.id} to={'/notice/' + notice.id}>
          {notice.imageUrl && (
            <NoticeImage
              key={notice.imageUrl}
              src={notice.imageUrl}
              title={notice.title}
              compact
            />
          )}
          <strong>{notice.title}</strong>
          <span>{displayDate(notice.event, true)}</span>
        </Link>
      ))}
      {!notices.length && (
        <Empty title={t('No active notices', 'کوئی فعال اعلان نہیں')} />
      )}
    </div>
  );
}
