import { ArrowRight, Building2, MapPin, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';
import { useScreenFilter } from '../../hooks/useScreenFilter';
import { urPrayers } from '../../i18n/prayerLabels';
import { tr } from '../../i18n/translate';
import { timeLabel } from '../../utils/date';

export function VenueList() {
  const { t, role, db } = useApp();
  const venues = useScopedVenues();
  const [q, setQ] = useScreenFilter('q', '');
  const [filter, setFilter] = useScreenFilter('status', 'All');
  const list = venues.filter(v => !db.page || db.page.ids.includes(v.id));
  return (
    <>
      <PageTitle
        title={t(
          role === 'representative' ? 'My mosques & venues' : 'Mosques & data quality',
          role === 'representative'
            ? 'میری مساجد اور مقامات'
            : 'مساجد اور معلومات کا معیار',
        )}
        description={t(
          'Manage the records within your current assignment.',
          'اپنی موجودہ ذمہ داری کے ریکارڈ سنبھالیں۔',
        )}
        action={
          <ButtonLink to="/manage/register">
            <Plus size={17} />
            {t('Register mosque', 'مسجد درج کریں')}
          </ButtonLink>
        }
      />
      <div className="results-toolbar">
        <input
          aria-label={tr('Search mosques')}
          placeholder={t('Search mosques…', 'مساجد تلاش کریں…')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label={tr('Filter status')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['All', 'Published', 'Draft', 'Maintenance pending'].map((s) => (
            <option key={s} value={s}>
              {tr(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="two-grid">
        {list.map((v) => (
          <Panel key={v.id}>
            <div className="row-between">
              <span className="icon-tile">
                <Building2 />
              </span>
              <Badge tone={v.status === 'Published' ? 'green' : 'amber'}>
                {tr(v.status)}
              </Badge>
            </div>
            <h2>{t(v.name, v.urdu)}</h2>
            <p className="location-text">
              <MapPin size={15} />
              {v.address}
            </p>
            <div className="mini-timetable">
              {Object.entries(v.times)
                .slice(0, 5)
                .map(([p, time]) => (
                  <div key={p}>
                    <small>{t(p, urPrayers[p])}</small>
                    <strong dir="ltr">{timeLabel(time)}</strong>
                  </div>
                ))}
            </div>
            <div className="card-actions">
              <ButtonLink secondary to={'/manage/mosques/' + v.id}>
                {t('Manage mosque', 'مسجد کا انتظام')}
              </ButtonLink>
              <ButtonLink to={'/manage/mosques/' + v.id + '/edit'}>
                {t('Update timings', 'اوقات بدلیں')}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
          </Panel>
        ))}
      </div>
      {!list.length && (
        <Empty
          title={t('No matching assigned mosques', 'کوئی متعلقہ مقررہ مسجد نہیں ملی')}
          action={
            <button
              onClick={() => {
                setQ('');
                setFilter('All');
              }}
            >
              {t('Clear filters', 'فلٹر ہٹائیں')}
            </button>
          }
        />
      )}
    </>
  );
}
