import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MosqueArt } from '../../components/discovery/MosqueArt';
import { status } from '../../components/discovery/timingLabel';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { Panel } from '../../components/ui/Panel';
import { isDisputed } from '../../domain/disputes';
import { noticeState } from '../../domain/notices';
import {
  pendingPrayer,
  resolveSpecial,
  resolveTimes,
  sessionsFor,
} from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { useNow } from '../../hooks/useNow';
import { prayerUr } from '../../i18n/prayerLabels';
import { tr } from '../../i18n/translate';
import { timeLabel } from '../../utils/date';

export function MosqueDetails() {
  const { id } = useParams();
  const now = useNow();
  const { db, t, toast } = useApp();
  const { query, suffix } = useQuery();
  const v = db.venues.find((v) => v.id === id);
  const [tab, setTab] = useState('timetable');
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ds-saved') || '[]').includes(id);
    } catch {
      return false;
    }
  });
  if (!v)
    return (
      <Empty
        title={t('Mosque not found', 'مسجد نہیں ملی')}
        action={
          <ButtonLink to="/results">{t('Back to results', 'نتائج پر واپس')}</ButtonLink>
        }
      />
    );
  const times = resolveTimes(v, db.proposals, query.date);
  const upcoming = db.proposals.filter(
    (p) => p.venueId === v.id && p.state === 'Approved' && p.effective > query.date,
  );
  const notices = db.notices.filter(
    (n) => n.venueId === id && noticeState(n, now) === 'Published',
  );
  return (
    <div className="container">
      <div className="breadcrumb">
        <Link to={'/results' + suffix}>{t('Search results', 'تلاش کے نتائج')}</Link>
        <ChevronRight size={14} />
        {t(v.name, v.urdu)}
      </div>
      <div className="venue-hero">
        <MosqueArt index={v.image} />
        <div>
          <Badge>{t('Participating mosque', 'شریک مسجد')}</Badge>
          <h1>{t(v.name, v.urdu)}</h1>
          <p>
            <MapPin size={17} />
            {v.address}
          </p>
          <div className="row">
            <ButtonLink to={`/mosque/${id}/directions${suffix}`}>
              <Navigation size={18} />
              {t('Get directions', 'راستہ دیکھیں')}
            </ButtonLink>
            <button
              className="secondary"
              onClick={() => {
                const a = JSON.parse(localStorage.getItem('ds-saved') || '[]');
                localStorage.setItem(
                  'ds-saved',
                  JSON.stringify(saved ? a.filter((x: string) => x !== id) : [...a, id]),
                );
                setSaved(!saved);
                toast(
                  t(
                    saved ? 'Removed from saved mosques' : 'Mosque saved on this device',
                    saved ? 'محفوظ مساجد سے ہٹا دیا' : 'مسجد اس ڈیوائس پر محفوظ ہو گئی',
                  ),
                );
              }}
            >
              <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
              {t(saved ? 'Saved' : 'Save', saved ? 'محفوظ' : 'محفوظ کریں')}
            </button>
            <button
              className="icon-button secondary"
              aria-label={tr('Share mosque')}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast(t('Link copied', 'لنک کاپی ہو گیا'));
                } catch {
                  toast(
                    t(
                      'Copy the link from your address bar',
                      'ایڈریس بار سے لنک کاپی کریں',
                    ),
                  );
                }
              }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <div className="tabs">
            {[
              ['timetable', 'Timetable', 'اوقات'],
              ['facilities', 'Facilities', 'سہولیات'],
              ['notices', 'Notice board', 'اعلانات'],
            ].map(([key, en, ur]) => (
              <button
                key={key}
                className={tab === key ? 'active' : ''}
                onClick={() => setTab(key)}
              >
                {t(en, ur)}
              </button>
            ))}
          </div>
          {tab === 'timetable' && (
            <Panel
              title={t('Complete Jama’at timetable', 'جماعت کے مکمل اوقات')}
              action={<Badge tone="neutral">{query.date}</Badge>}
            >
              {upcoming.length > 0 && (
                <Alert>
                  {t('Approved future schedules', 'منظور شدہ آئندہ اوقات')}:{' '}
                  {upcoming.map((p) => (
                    <p key={p.id}>
                      {p.effective} ·{' '}
                      {Object.entries(p.times)
                        .map(([name, time]) => name + ' ' + timeLabel(time))
                        .join(' · ')}
                    </p>
                  ))}
                </Alert>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Prayer', 'نماز')}</th>
                      <th>{t('Jama’at', 'جماعت')}</th>
                      <th>{t('Timing status', 'اوقات کی حیثیت')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(times).map((p) => (
                      <tr className={p === query.prayer ? 'highlight-row' : ''} key={p}>
                        <td>
                          <span className="row">
                            <Clock size={17} />
                            {t(p, prayerUr[p])}
                          </span>
                        </td>
                        <td className="time-cell" dir="ltr">
                          {sessionsFor(v, db.proposals, p, query.date)
                            .map((s) => timeLabel(s.time))
                            .join(' / ') ||
                            t('No session on this date', 'اس تاریخ پر جماعت نہیں')}
                        </td>
                        <td>
                          <Badge
                            tone={
                              isDisputed(v, p, query.date) ||
                              pendingPrayer(v, db.proposals, p, query.date)
                                ? 'amber'
                                : 'green'
                            }
                          >
                            {status(
                              v,
                              pendingPrayer(v, db.proposals, p, query.date),
                              t,
                              isDisputed(v, p, query.date),
                            )}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="section-title spaced">
                <h3>{t('Friday & special sessions', 'جمعہ اور خصوصی جماعتیں')}</h3>
              </div>
              {resolveSpecial(v, db.proposals, query.date).map((s) => (
                <div className="list-row" key={s.id}>
                  <div>
                    <strong>{t(s.prayer, prayerUr[s.prayer])}</strong>
                    <small>
                      {t('Khutbah', 'خطبہ')} {timeLabel(s.khutbah)} · {s.date} ·{' '}
                      {s.canceled
                        ? t('Canceled', 'منسوخ')
                        : s.provisional
                          ? t('Provisional', 'عارضی')
                          : t('Confirmed date', 'تصدیق شدہ تاریخ')}
                    </small>
                  </div>
                  <strong dir="ltr">{timeLabel(s.time)}</strong>
                </div>
              ))}
              <Alert>
                {t(
                  'Jama’at is the congregation start. Prayer beginnings and Khutbah are different times.',
                  'جماعت، نماز کے آغاز اور خطبے کے اوقات مختلف ہیں۔',
                )}
              </Alert>
              <ButtonLink secondary to={`/mosque/${id}/session${suffix}`}>
                {t('Session & arrival details', 'جماعت اور آمد کی تفصیلات')}
                <ArrowRight size={16} />
              </ButtonLink>
            </Panel>
          )}
          {tab === 'facilities' && (
            <Panel title={t('Facilities & accessibility', 'سہولیات اور رسائی')}>
              <div className="two-grid">
                {Object.entries(v.facilities).map(([key, val]) => (
                  <div className="facility" key={key}>
                    <Check size={20} />
                    <div>
                      <strong>{tr(key)}</strong>
                      <small>{t(val, val === 'Available' ? 'دستیاب' : 'نامعلوم')}</small>
                    </div>
                  </div>
                ))}
              </div>
              <Alert>
                {t(
                  'Unknown facilities are not assumed to be available. Please check with the mosque.',
                  'نامعلوم سہولیات کو دستیاب نہیں سمجھا جاتا۔ مسجد سے تصدیق کریں۔',
                )}
              </Alert>
            </Panel>
          )}
          {tab === 'notices' && (
            <Panel title={t('Active notices', 'فعال اعلانات')}>
              <ButtonLink secondary to={'/notices?venue=' + v.id}>
                {t('View all notices', 'تمام اعلانات دیکھیں')}
              </ButtonLink>
              {notices.length ? (
                notices.map((n) => (
                  <Link to={'/notice/' + n.id} className="notice-row" key={n.id}>
                    <CalendarDays />
                    <div>
                      <Badge tone="neutral">{tr(n.category)}</Badge>
                      <h3>{n.title}</h3>
                      <p>{n.body}</p>
                    </div>
                    <ChevronRight />
                  </Link>
                ))
              ) : (
                <Empty title={t('No active notices', 'کوئی فعال اعلان نہیں')} />
              )}
            </Panel>
          )}
        </div>
        <aside className="stack">
          <Panel title={t('Timing confidence', 'اوقات پر اعتماد')}>
            <ShieldCheck className="green-text" size={30} />
            <dl className="definition-list">
              <dt>{t('Last phone verification', 'آخری فون تصدیق')}</dt>
              <dd>{v.phoneVerified || t('Not recorded', 'درج نہیں')}</dd>
              <dt>{t('Representative reconfirmation', 'نمائندے کی دوبارہ تصدیق')}</dt>
              <dd>{v.reconfirmed}</dd>
              <dt>{t('Maintenance', 'دیکھ بھال')}</dt>
              <dd>{tr(v.status)}</dd>
            </dl>
            <Link className="text-link" to="/timing-status">
              {t('What these labels mean', 'ان اصطلاحات کا مطلب')}
              <ArrowRight size={16} />
            </Link>
          </Panel>
          <Panel title={t('Entrance & navigation', 'داخلی دروازہ اور راستہ')}>
            <p>{v.address}</p>
            <ButtonLink secondary to={`/mosque/${id}/directions${suffix}`}>
              <Navigation size={17} />
              {t('Open directions', 'راستہ کھولیں')}
            </ButtonLink>
          </Panel>
          <Panel title={t('Something not quite right?', 'کیا معلومات درست نہیں؟')}>
            <p>
              {t(
                'Let the responsible team know about an incorrect time or location.',
                'غلط وقت یا مقام سے ذمہ دار ٹیم کو آگاہ کریں۔',
              )}
            </p>
            <ButtonLink secondary to={'/report?venue=' + v.id}>
              {t('Report an issue', 'مسئلہ رپورٹ کریں')}
            </ButtonLink>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
