import {
  ChevronRight,
  List,
  Map as MapIcon,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPreview } from '../../components/discovery/MapPreview';
import { MosqueCard } from '../../components/discovery/MosqueCard';
import { SearchControls } from '../../components/discovery/SearchControls';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageTitle } from '../../components/ui/PageTitle';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { useSessions } from '../../hooks/useSessions';
import { prayerUr } from '../../i18n/prayerLabels';

export function Results({ map = false }: { map?: boolean }) {
  const { t } = useApp();
  const { params, query, change } = useQuery();
  const sessions = useSessions();
  const [limit, setLimit] = useState(6);
  const [filter, setFilter] = useState(false);
  const [selected, setSelected] = useState('al-falah');
  return (
    <div className="container results-page">
      <div className="breadcrumb">
        <Link to="/">{t('Home', 'ہوم')}</Link>
        <ChevronRight size={14} />
        {t('Search results', 'تلاش کے نتائج')}
      </div>
      <SearchControls compact />
      <PageTitle
        eyebrow={t('FIND YOUR CONGREGATION', 'اپنی جماعت تلاش کریں')}
        title={`${t('Upcoming', 'آئندہ')} ${t(query.prayer, prayerUr[query.prayer])} ${t('Jama’ats', 'جماعتیں')}`}
        description={`${sessions.length} ${t('sample sessions', 'نمونہ جماعتیں')} · ${query.date} · ${t(query.scope === 'city' ? 'Whole City · Lahore' : 'Nearby · sample area', query.scope === 'city' ? 'پورا شہر · لاہور' : 'قریبی نمونہ علاقہ')}`}
      />
      <div className="results-toolbar">
        <div className="row">
          <button className="secondary" onClick={() => setFilter(true)}>
            <SlidersHorizontal size={17} />
            {t('Filters', 'فلٹرز')}
          </button>
          <select
            aria-label="Sort results"
            value={query.sort}
            onChange={(e) => change('sort', e.target.value)}
          >
            <option value="time">{t('Earliest Jama’at', 'سب سے پہلے جماعت')}</option>
            <option value="name">{t('Mosque name', 'مسجد کا نام')}</option>
          </select>
        </div>
        <div className="segment">
          <Link className={!map ? 'active' : ''} to={'/results?' + params}>
            <List size={17} />
            {t('List', 'فہرست')}
          </Link>
          <Link className={map ? 'active' : ''} to={'/map?' + params}>
            <MapIcon size={17} />
            {t('Map', 'نقشہ')}
          </Link>
        </div>
      </div>
      <Alert>
        {t(
          'Sample timetable results. Arrival estimates are unavailable until validated walking and motorcycle routes are connected.',
          'نمونہ اوقات۔ تصدیق شدہ راستے منسلک ہونے تک آمد کے اندازے دستیاب نہیں۔',
        )}
      </Alert>
      {map && (
        <div className="map-layout">
          <MapPreview
            large
            items={sessions.map((s) => s.venue)}
            selected={selected}
            onSelect={setSelected}
          />
          <div>
            {sessions
              .filter((s) => s.venue.id === selected)
              .slice(0, 1)
              .map((s) => (
                <MosqueCard
                  key={s.venue.id}
                  venue={s.venue}
                  sessionId={s.id}
                  time={s.time}
                  prayer={query.prayer}
                />
              ))}
          </div>
        </div>
      )}
      {!sessions.length ? (
        <Empty
          title={t(
            'No upcoming Jama’at matches your selection',
            'آپ کے انتخاب سے کوئی آئندہ جماعت نہیں ملی',
          )}
          description={t(
            'Your prayer and date are unchanged. Try a different date, area, or Whole City.',
            'نماز اور تاریخ تبدیل نہیں کی گئی۔ مختلف تاریخ یا علاقہ منتخب کریں۔',
          )}
          action={
            <button
              onClick={() => {
                change('scope', 'city');
                change('area', '');
              }}
            >
              {t('Search Whole City', 'پورے شہر میں تلاش')}
            </button>
          }
        />
      ) : (
        <div className="results-grid">
          {sessions.slice(0, limit).map((s) => (
            <MosqueCard
              key={s.venue.id + s.id}
              venue={s.venue}
              sessionId={s.id}
              time={s.time}
              prayer={query.prayer}
              provisional={s.provisional}
            />
          ))}
        </div>
      )}
      {sessions.length > limit && (
        <button className="secondary load-more" onClick={() => setLimit((x) => x + 6)}>
          {t('Load more sessions', 'مزید جماعتیں')}
        </button>
      )}
      <div className="suggest-strip">
        <div>
          <h3>{t('Can’t find your mosque?', 'آپ کی مسجد نہیں مل رہی؟')}</h3>
          <p>
            {t(
              'Help us grow responsibly, one mosque at a time.',
              'ایک ایک مسجد کے ساتھ ذمہ داری سے آگے بڑھیں۔',
            )}
          </p>
        </div>
        <ButtonLink secondary to="/suggest">
          <Plus size={18} />
          {t('Suggest a mosque', 'مسجد تجویز کریں')}
        </ButtonLink>
      </div>
      {filter && (
        <Modal
          title={t('Search filters', 'تلاش کے فلٹرز')}
          onClose={() => setFilter(false)}
        >
          <div className="stack">
            <Field label={t('Area', 'علاقہ')}>
              <select value={query.area} onChange={(e) => change('area', e.target.value)}>
                <option value="">{t('All areas', 'تمام علاقے')}</option>
                {['Gulberg III', 'Canal Park', 'Model Town'].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label={t('Nearby radius', 'قریبی دائرہ')}>
              <select
                disabled={query.scope === 'city'}
                value={query.radius}
                onChange={(e) => change('radius', e.target.value)}
              >
                <option value="5">5 km</option>
                <option value="7">7 km</option>
              </select>
            </Field>
            <Alert>
              {t(
                'Whole City has no nearby radius cap. Journey sorting requires validated routes.',
                'پورے شہر کی تلاش پر فاصلے کی حد نہیں۔',
              )}
            </Alert>
            <button onClick={() => setFilter(false)}>
              {t('Show results', 'نتائج دکھائیں')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
