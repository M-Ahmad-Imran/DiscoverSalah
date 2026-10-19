import { LocateFixed, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPreview } from '../../components/discovery/MapPreview';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';

export function LocationPage() {
  const { t, toast } = useApp();
  const { params, query } = useQuery();
  const [area, setArea] = useState(query.origin || '');
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const gps = () => {
    setError('');
    setBusy(true);
    if (!navigator.geolocation) {
      setBusy(false);
      setError(
        t(
          'Location is unsupported. Enter your starting point below.',
          'مقام دستیاب نہیں۔ اپنا مقام درج کریں۔',
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({
          lat: p.coords.latitude.toFixed(6),
          lng: p.coords.longitude.toFixed(6),
        });
        setArea(t('My confirmed location', 'میرا تصدیق شدہ مقام'));
        setBusy(false);
      },
      () => {
        setError(
          t(
            'Location access was denied or unavailable. You can enter your location manually.',
            'مقام کی اجازت نہیں ملی۔ اپنا مقام خود درج کریں۔',
          ),
        );
        setBusy(false);
      },
      { timeout: 12000 },
    );
  };
  return (
    <div className="container narrow">
      <PageTitle
        eyebrow={t('A GOOD JOURNEY STARTS HERE', 'سفر یہاں سے شروع ہوتا ہے')}
        title={t(
          'Where would you like to find a mosque?',
          'آپ کہاں مسجد تلاش کرنا چاہتے ہیں؟',
        )}
        description={t(
          'Choose a starting point. Your precise location is used only for this session.',
          'ابتدائی مقام منتخب کریں۔ درست مقام صرف اس سیشن میں استعمال ہوتا ہے۔',
        )}
      />
      <Panel>
        <button className="full" onClick={gps} disabled={busy}>
          <LocateFixed size={20} />
          {busy
            ? t('Finding your location…', 'مقام تلاش ہو رہا ہے…')
            : t('Use my current location', 'میرا موجودہ مقام استعمال کریں')}
        </button>
        {error && <Alert tone="warning">{error}</Alert>}
        <div className="or-divider">{t('or choose manually', 'یا خود منتخب کریں')}</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            params.set('origin', area);
            if (coords.lat && coords.lng)
              sessionStorage.setItem('ds-origin', JSON.stringify(coords));
            navigate('/results?' + params);
            toast(t('Starting point confirmed', 'ابتدائی مقام کی تصدیق ہو گئی'));
          }}
          className="stack"
        >
          <Field label={t('City', 'شہر')}>
            <select>
              <option>Lahore — sample coverage</option>
            </select>
          </Field>
          <Field label={t('Area, address or landmark', 'علاقہ، پتہ یا مشہور مقام')}>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              placeholder={t(
                'e.g. Main Boulevard, Gulberg III',
                'مثلاً مین بلیوارڈ، گلبرگ III',
              )}
            />
          </Field>
          <MapPreview items={[]} large />
          <Alert>
            {t(
              'This is an illustrative map. Enter coordinates below to confirm a precise origin, or browse by area without arrival estimates.',
              'یہ نمونہ نقشہ ہے۔ درست مقام کے لیے مختصات درج کریں یا علاقے کے اوقات دیکھیں۔',
            )}
          </Alert>
          <div className="two-grid">
            <Field label={t('Latitude (optional)', 'عرض البلد (اختیاری)')}>
              <input
                type="number"
                min="-90"
                max="90"
                step="any"
                value={coords.lat}
                onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
              />
            </Field>
            <Field label={t('Longitude (optional)', 'طول البلد (اختیاری)')}>
              <input
                type="number"
                min="-180"
                max="180"
                step="any"
                value={coords.lng}
                onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
              />
            </Field>
          </div>
          <button type="submit">
            <MapPin size={18} />
            {t('Confirm location', 'مقام کی تصدیق')}
          </button>
          <ButtonLink secondary to={'/results?' + params}>
            {t(
              'Browse timings without a starting point',
              'ابتدائی مقام کے بغیر اوقات دیکھیں',
            )}
          </ButtonLink>
        </form>
      </Panel>
    </div>
  );
}
