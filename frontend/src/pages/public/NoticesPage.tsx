import { Link } from 'react-router-dom';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { useApp } from '../../hooks/useApp';
import { displayDate } from '../../i18n/translate';

export function PublicNotices() {
  const { db, t } = useApp();
  return (
    <div className="container narrow">
      <PageTitle title={t('Active notices', 'فعال اعلانات')} />
      {db.notices.map((notice) => (
        <Link className="list-row" key={notice.id} to={'/notice/' + notice.id}>
          <strong>{notice.title}</strong>
          <span>{displayDate(notice.event, true)}</span>
        </Link>
      ))}
      {!db.notices.length && (
        <Empty title={t('No active notices', 'کوئی فعال اعلان نہیں')} />
      )}
    </div>
  );
}
