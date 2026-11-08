import { LocateFixed, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { setOrigin } from '../../services/origin';

export function LocationPage() {
  const { t, toast, db } = useApp();
  const { params, query } = useQuery();
  const [city, setCity] = useState(query.city || db.areas[0]?.city || '');
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
            params.delete('cursor');
            params.set('origin', area.trim() || city.trim());
            params.set('city', city.trim());
            params.delete('area');
            if (coords.lat && coords.lng) {
              params.delete('city');
              setOrigin({ lat: Number(coords.lat), lng: Number(coords.lng) });
              params.set('scope', 'nearby');
            } else {
              setOrigin(null);
              params.set('scope', 'city');
            }
            navigate('/results?' + params);
            toast(t('Starting point confirmed', 'ابتدائی مقام کی تصدیق ہو گئی'));
          }}
          className="stack"
        >
          <Field label={t('City', 'شہر')}>
            <input
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setCoords({ lat: '', lng: '' });
              }}
              required={!coords.lat || !coords.lng}
              maxLength={100}
              autoComplete="address-level2"
              placeholder={t('e.g. Lahore', 'مثلاً لاہور')}
            />
          </Field>
          <Field
            label={t('Location label (optional)', 'مقام کا نام (اختیاری)')}
            hint={t(
              'This label is for your reference. Without GPS, results are filtered by city only.',
              'یہ نام صرف آپ کی آسانی کے لیے ہے۔ لوکیشن کے بغیر پورے شہر کی مساجد نظر آئیں گی۔',
            )}
          >
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={t(
                'e.g. Main Boulevard, Gulberg III',
                'مثلاً مین بلیوارڈ، گلبرگ III',
              )}
            />
          </Field>
          <Alert>
            {t(
              'For nearby mosques, tap Use my current location and allow location access. You can also enter a city without sharing your location. Directions open in Google Maps.',
              'قریبی مسجد کے لیے اوپر موجودہ مقام کا بٹن دبائیں اور لوکیشن کی اجازت دیں۔ اجازت نہیں دینا چاہتے تو شہر لکھ کر مساجد دیکھیں۔ راستہ گوگل میپس میں کھلے گا۔',
            )}
          </Alert>
          <details>
            <summary>
              {t(
                'Enter map coordinates (optional)',
                'نقشے کے کوآرڈینیٹس درج کریں (اختیاری)',
              )}
            </summary>
            <div className="two-grid">
              <Field label={t('Latitude (optional)', 'عرض البلد (اختیاری)')}>
                <input
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  required={!!coords.lng}
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
                  required={!!coords.lat}
                  value={coords.lng}
                  onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
                />
              </Field>
            </div>
          </details>
          <button type="submit">
            <MapPin size={18} />
            {t('Show mosques', 'مساجد دکھائیں')}
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
