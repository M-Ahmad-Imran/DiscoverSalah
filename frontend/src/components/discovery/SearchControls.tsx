import { Bike, ChevronRight, Footprints, MapPin, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { prayers } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { prayerUr } from '../../i18n/prayerLabels';
import { Field } from '../ui/Field';

export function SearchControls({ compact = false }: { compact?: boolean }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const { query, change, params } = useQuery();
  return (
    <form
      className={`search-controls ${compact ? 'compact' : ''}`}
      action="/results"
      onSubmit={(e) => {
        e.preventDefault();
        navigate('/results?' + params.toString());
      }}
    >
      <div className="search-top">
        <label className="location-control">
          <MapPin size={22} />
          <span>
            <small>{t('YOUR STARTING POINT', 'آپ کا ابتدائی مقام')}</small>
            <Link to={'/location?' + params}>
              {query.origin || t('Choose your location', 'اپنا مقام منتخب کریں')}
              <ChevronRight size={16} />
            </Link>
          </span>
        </label>
        <div className="segment">
          {[
            ['nearby', 'Nearby', 'قریب'],
            ['city', 'Whole City', 'پورا شہر'],
          ].map(([v, en, ur]) => (
            <button
              key={v}
              type="button"
              className={query.scope === v ? 'active' : ''}
              onClick={() => change('scope', v)}
            >
              {t(en, ur)}
            </button>
          ))}
        </div>
      </div>
      <div className="search-fields">
        <Field label={t('Prayer / congregation', 'نماز / جماعت')}>
          <select value={query.prayer} onChange={(e) => change('prayer', e.target.value)}>
            {prayers.map((p) => (
              <option key={p} value={p}>
                {t(p, prayerUr[p])}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('Date', 'تاریخ')}>
          <input
            type="date"
            value={query.date}
            onInput={(e) => change('date', e.currentTarget.value)}
            required
          />
        </Field>
        <fieldset className="field">
          <legend>{t('Travel mode', 'سفر کا طریقہ')}</legend>
          <span className="segment mode">
            {[
              ['walking', 'Walking', 'پیدل', Footprints],
              ['motorcycle', 'Motorcycle', 'موٹر سائیکل', Bike],
            ].map(([v, en, ur, I]) => {
              const Icon = I as typeof Footprints;
              return (
                <button
                  key={v as string}
                  type="button"
                  className={query.mode === v ? 'active' : ''}
                  onClick={() => change('mode', v as string)}
                >
                  <Icon size={19} />
                  {t(en as string, ur as string)}
                </button>
              );
            })}
          </span>
        </fieldset>
        <button type="submit">
          <Search size={18} />
          {t('Find Jama’at', 'جماعت تلاش کریں')}
        </button>
      </div>
    </form>
  );
}
