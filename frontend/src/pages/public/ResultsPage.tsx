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
import { RecordSelect } from '../../components/ui/RecordSelect';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { useSessions } from '../../hooks/useSessions';
import { prayerUr } from '../../i18n/prayerLabels';
import { tr } from '../../i18n/translate';

export function Results({ map = false }: { map?: boolean }) {
  const { t, db } = useApp();
  const { params, query, change } = useQuery();
  const sessions = useSessions();
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
        description={`${sessions.length} ${t('sessions', 'جماعتیں')} · ${query.date} · ${t(query.scope === 'city' ? 'Whole City' : 'Nearby', query.scope === 'city' ? 'پورا شہر' : 'قریبی علاقہ')}`}
      />
      <div className="results-toolbar">
        <div className="row">
          <button className="secondary" onClick={() => setFilter(true)}>
            <SlidersHorizontal size={17} />
            {t('Filters', 'فلٹرز')}
          </button>
          <select
            aria-label={tr('Sort results')}
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
            {t('Locations', 'مقامات')}
          </Link>
        </div>
      </div>
      <Alert>
        {t(
          'Participating mosque timetables. Directions open in Google Maps; arrival estimates are not shown in this app.',
          'شریک مساجد کے اوقات۔ راستہ گوگل میپس میں کھلتا ہے؛ اس ایپ میں آمد کا اندازہ دستیاب نہیں۔',
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
          {sessions.map((s) => (
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
              <RecordSelect
                resource="areas"
                nameValue
                value={query.area}
                onChange={(e) => change('area', e.target.value)}
              >
                <option value="">{t('All areas', 'تمام علاقے')}</option>
                {[...new Set(db.areas.map((area) => area.name))].map((a) => (
                  <option key={a} value={a}>
                    {tr(a)}
                  </option>
                ))}
              </RecordSelect>
            </Field>
            <Field label={t('Nearby radius', 'قریبی دائرہ')}>
              <select
                disabled={query.scope === 'city'}
                value={query.radius}
                onChange={(e) => change('radius', e.target.value)}
              >
                <option value="5">{tr('5 km')}</option>
                <option value="7">{tr('7 km')}</option>
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
