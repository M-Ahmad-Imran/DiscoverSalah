import { useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { NoticeImage } from '../../components/ui/NoticeImage';
import { noticeState } from '../../domain/notices';
import { useApp } from '../../hooks/useApp';
import { useNow } from '../../hooks/useNow';
import { displayDate } from '../../i18n/translate';

export function NoticeDetail() {
  const { id } = useParams();
  const now = useNow();
  const { db, t } = useApp();
  const n = db.notices.find((n) => n.id === id && noticeState(n, now) === 'Published');
  if (!n)
    return (
      <Empty
        title={t('This notice is no longer active', 'یہ اعلان اب فعال نہیں')}
        action={<ButtonLink to="/">{t('Return home', 'ہوم پر واپس')}</ButtonLink>}
      />
    );
  return (
    <div className="container narrow">
      <PageTitle eyebrow={n.category} title={n.title} />
      <Panel>
        <Badge>{t('Approved notice', 'منظور شدہ اعلان')}</Badge>
        <p>{n.body}</p>
        {n.imageUrl && <NoticeImage key={n.imageUrl} src={n.imageUrl} title={n.title} />}
        <dl className="definition-list">
          <dt>{t('Event', 'تقریب')}</dt>
          <dd>{displayDate(n.event, true)}</dd>
          <dt>{t('Expires', 'اختتام')}</dt>
          <dd>{displayDate(n.expires, true)}</dd>
        </dl>
        <ButtonLink to={'/mosque/' + n.venueId}>
          {t('View mosque', 'مسجد دیکھیں')}
        </ButtonLink>
      </Panel>
    </div>
  );
}
