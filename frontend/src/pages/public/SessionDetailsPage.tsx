import { Navigation } from 'lucide-react';
import { Link,useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { isDisputed } from '../../domain/disputes';
import { sessionsFor } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { useNow } from '../../hooks/useNow';
import { prayerUr } from '../../i18n/prayerLabels';
import { tr } from '../../i18n/translate';
import { timeLabel } from '../../utils/date';

export function SessionDetails() {
  const { id } = useParams();
  const { db, t } = useApp();
  const now = useNow();
  const { query, suffix, params } = useQuery();
  const v = db.venues.find((x) => x.id === id);
  if (!v) return <Empty title={t('Mosque not found', 'مسجد نہیں ملی')} />;
  const sessions = sessionsFor(v, db.proposals, query.prayer, query.date);
  const selected = params.get('session');
  const session = selected ? sessions.find((s) => s.id === selected) : sessions[0];
  if (!session)
    return (
      <Empty
        title={t('Session unavailable', 'جماعت دستیاب نہیں')}
        description={t(
          'This session may have been canceled or changed. Check the current timetable.',
          'یہ جماعت منسوخ یا تبدیل ہو سکتی ہے۔ موجودہ اوقات چیک کریں۔',
        )}
        action={
          <ButtonLink to={'/mosque/' + id + suffix}>
            {t('View timetable', 'اوقات دیکھیں')}
          </ButtonLink>
        }
      />
    );
  return (
    <div className="container narrow">
      <PageTitle
        eyebrow={t(v.name, v.urdu)}
        title={t('Session details', 'جماعت کی تفصیلات')}
      />
      <Panel
        title={t(query.prayer, prayerUr[query.prayer]) + ' · ' + timeLabel(session.time)}
      >
        <p>{query.date}{tr("· Asia/Karachi")}</p>
        {Date.parse(query.date + 'T' + session.time + ':00+05:00') <= now && (
          <Alert tone="warning">
            {t(
              'This session has already started. It is not an upcoming recommendation.',
              'یہ جماعت شروع ہو چکی ہے۔ یہ آئندہ جماعت نہیں ہے۔',
            )}
          </Alert>
        )}
        {session.khutbah && (
          <p>
            {t('Khutbah', 'خطبہ')}: {timeLabel(session.khutbah)}
          </p>
        )}
        {session.provisional && (
          <Alert tone="warning">
            {t(
              'Provisional session — confirm with the mosque.',
              'عارضی جماعت — مسجد سے تصدیق کریں۔',
            )}
          </Alert>
        )}
        {isDisputed(v, query.prayer, query.date) && (
          <Alert tone="warning">
            {t(
              'This prayer and date are disputed. Confirm with the mosque before travelling.',
              'یہ نماز اور تاریخ متنازع ہیں۔ سفر سے پہلے مسجد سے تصدیق کریں۔',
            )}
          </Alert>
        )}
        <Alert tone="warning">
          {t(
            'Travel times are provided separately by Google Maps. DiscoverSalah does not calculate arrival estimates.',
            'سفر کا دورانیہ گوگل میپس میں الگ دستیاب ہے۔ ڈسکور صلاح آمد کا اندازہ نہیں لگاتا۔',
          )}
        </Alert>
        <dl className="definition-list">
          <dt>{t('Travel mode', 'سفر کا طریقہ')}</dt>
          <dd>
            {t(
              query.mode === 'walking' ? 'Walking' : 'Motorcycle',
              query.mode === 'walking' ? 'پیدل' : 'موٹر سائیکل',
            )}
          </dd>
          <dt>{t('Destination entrance', 'منزل کا داخلی دروازہ')}</dt>
          <dd>{v.address}</dd>
        </dl>
        <ButtonLink to={`/mosque/${id}/directions${suffix}`}>
          <Navigation size={18} />
          {t('Directions with Google Maps', 'گوگل میپس سے راستہ دیکھیں')}
        </ButtonLink>
        <Link className="text-link spaced" to={'/mosque/' + id + suffix}>
          {t('Back to mosque details', 'مسجد کی تفصیلات پر واپس')}
        </Link>
      </Panel>
    </div>
  );
}
