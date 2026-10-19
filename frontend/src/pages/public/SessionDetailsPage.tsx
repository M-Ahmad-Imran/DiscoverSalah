import { Navigation } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPreview } from '../../components/discovery/MapPreview';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { isDisputed } from '../../domain/disputes';
import { sessionsFor } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { useNow } from '../../hooks/useNow';
import { prayerUr } from '../../i18n/prayerLabels';
import { timeLabel } from '../../utils/date';

export function SessionDetails({ directions = false }: { directions?: boolean }) {
  const { id } = useParams();
  const { db, t } = useApp();
  const now = useNow();
  const { query, suffix, params, change } = useQuery();
  const v = db.venues.find((x) => x.id === id);
  const [prep, setPrep] = useState(query.mode === 'walking' ? 5 : 8);
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
        title={t(
          directions ? 'Your route to the mosque' : 'Session & arrival estimate',
          directions ? 'مسجد تک آپ کا راستہ' : 'جماعت اور آمد کا اندازہ',
        )}
      />
      <Panel
        title={t(query.prayer, prayerUr[query.prayer]) + ' · ' + timeLabel(session.time)}
      >
        <p>{query.date} · Asia/Karachi</p>
        {Date.parse(query.date + 'T' + session.time + ':00+05:00') <= now && (
          <Alert tone="warning">
            {t(
              'This session has already started. It is not an upcoming recommendation.',
              'یہ جماعت شروع ہو چکی ہے۔ یہ آئندہ جماعت نہیں ہے۔',
            )}
          </Alert>
        )}
        <Field label={t('Travel mode', 'سفر کا طریقہ')}>
          <select
            value={query.mode}
            onChange={(e) => {
              change('mode', e.target.value);
              setPrep(Math.max(prep, e.target.value === 'walking' ? 5 : 8));
            }}
          >
            <option value="walking">{t('Walking', 'پیدل')}</option>
            <option value="motorcycle">{t('Motorcycle', 'موٹر سائیکل')}</option>
          </select>
        </Field>
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
        <MapPreview items={[v]} large />
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
            'Arrival estimate unavailable. This preview has no validated route duration or uncertainty allowance.',
            'آمد کا اندازہ دستیاب نہیں۔ اس پیش نظارے میں تصدیق شدہ سفر کا دورانیہ موجود نہیں۔',
          )}
        </Alert>
        <Field
          label={t('Preparation allowance (minutes)', 'تیاری کا وقت (منٹ)')}
          hint={t(
            'Proposed minimum; parking, entrance walk and Wudu.',
            'مجوزہ کم از کم؛ پارکنگ، پیدل سفر اور وضو۔',
          )}
        >
          <input
            type="number"
            min={query.mode === 'walking' ? 5 : 8}
            value={prep}
            onChange={(e) => setPrep(Number(e.target.value))}
          />
        </Field>
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
        {directions ? (
          <>
            <Alert>
              {t(
                'Google Maps opens in a new tab and receives the destination. For motorcycle travel, select an appropriate supported mode in Google Maps; no car estimate is used here.',
                'گوگل میپس نئی ٹیب میں کھلے گا۔ موٹر سائیکل کا موزوں طریقہ گوگل میپس میں منتخب کریں۔',
              )}
            </Alert>
            <a
              className="button full"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}${query.mode === 'walking' ? '&travelmode=walking' : ''}`}
            >
              <Navigation size={18} />
              {t('Continue to Google Maps', 'گوگل میپس پر جائیں')}
            </a>
          </>
        ) : (
          <ButtonLink to={`/mosque/${id}/directions${suffix}`}>
            <Navigation size={18} />
            {t('View directions', 'راستہ دیکھیں')}
          </ButtonLink>
        )}
        <Link className="text-link spaced" to={'/mosque/' + id + suffix}>
          {t('Back to mosque details', 'مسجد کی تفصیلات پر واپس')}
        </Link>
      </Panel>
    </div>
  );
}
