import { Navigation } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { googleMapsDirections } from '../../services/googleMaps';

export function Directions() {
  const { id } = useParams();
  const { db, t } = useApp();
  const { query, change, suffix } = useQuery();
  const venue = db.venues.find(
    (v) => v.id === id && ['Published', 'Maintenance pending'].includes(v.status),
  );
  if (!venue) return <Empty title={t('Mosque not found', 'مسجد نہیں ملی')} />;
  const href = googleMapsDirections(venue, query.mode);
  return (
    <div className="container narrow">
      <PageTitle
        eyebrow={t(venue.name, venue.urdu)}
        title={t('Directions to the mosque', 'مسجد کا راستہ')}
      />
      <Panel title={t('Destination entrance', 'منزل کا داخلی دروازہ')}>
        <p>{venue.address}</p>
        <Field label={t('Travel mode', 'سفر کا طریقہ')}>
          <select
            value={query.mode === 'motorcycle' ? 'motorcycle' : 'walking'}
            onChange={(e) => change('mode', e.target.value)}
          >
            <option value="walking">{t('Walking', 'پیدل')}</option>
            <option value="motorcycle">{t('Motorcycle', 'موٹر سائیکل')}</option>
          </select>
        </Field>
        <p>
          {t(
            'Google Maps opens after you tap the button. Only the mosque entrance is included in the link; choose your starting point in Google Maps.',
            'بٹن دبانے پر گوگل میپس کھلے گا۔ لنک میں صرف مسجد کا داخلی مقام شامل ہے؛ اپنا ابتدائی مقام گوگل میپس میں منتخب کریں۔',
          )}
        </p>
        {query.mode === 'motorcycle' && (
          <p>
            {t(
              'Motorcycle directions depend on Google Maps coverage. Check the selected mode there; DiscoverSalah does not substitute a car route.',
              'موٹر سائیکل کا راستہ گوگل میپس کی دستیابی پر منحصر ہے۔ وہاں منتخب طریقہ چیک کریں؛ ڈسکور صلاح گاڑی کے راستے کو موٹر سائیکل کا راستہ نہیں سمجھتا۔',
            )}
          </p>
        )}
        {href ? (
          <a
            className="button full"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            <Navigation size={18} />
            {t('Open Google Maps', 'گوگل میپس کھولیں')}
          </a>
        ) : (
          <Alert tone="warning">
            {t(
              'Entrance coordinates are unavailable. Please report the location issue.',
              'داخلی مقام کے مختصات دستیاب نہیں۔ مقام کی خرابی کی اطلاع دیں۔',
            )}
          </Alert>
        )}
        <Alert>
          {t(
            'Check the mosque timetable separately. DiscoverSalah does not calculate travel time or whether you will arrive before Jama’at.',
            'مسجد کے اوقات الگ سے چیک کریں۔ ڈسکور صلاح سفر کا دورانیہ یا جماعت سے پہلے پہنچنے کا اندازہ نہیں لگاتا۔',
          )}
        </Alert>
        <ButtonLink secondary to={'/mosque/' + id + suffix}>
          {t('View mosque timetable', 'مسجد کے اوقات دیکھیں')}
        </ButtonLink>
      </Panel>
    </div>
  );
}
