import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPreview } from '../../components/discovery/MapPreview';
import { Timetable } from '../../components/management/Timetable';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { Steps } from '../../components/ui/Steps';
import { daily } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { RequestRecord, Venue } from '../../types/index';
import { uid } from '../../utils/id';

export function Registration() {
  const { db, role, actor, update, t, toast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    city: 'Lahore',
    area: 'Gulberg III',
    kind: 'Mosque',
    Fajr: '05:20',
    Dhuhr: '13:30',
    Asr: '16:15',
    Maghrib: '17:40',
    Isha: '19:15',
  });
  const [dirty, setDirty] = useState(false);
  const allowLeave = useUnsavedChanges(dirty);
  const [permission, setPermission] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const set = (k: string, v: string) => setValues({ ...values, [k]: v });
  const field = (k: string, en: string, ur: string, type = 'text', required = true) => (
    <Field label={t(en, ur)}>
      <input
        type={type}
        required={required}
        value={values[k] || ''}
        onChange={(e) => set(k, e.target.value)}
      />
    </Field>
  );
  const duplicates = values.name
    ? db.venues.filter((v) => v.name.toLowerCase().includes(values.name.toLowerCase()))
    : [];
  return (
    <>
      <PageTitle
        title={t('Register a mosque', 'مسجد درج کریں')}
        description={t(
          'Build a complete record for independent registration and timetable verification. Use sample information in this preview.',
          'آزاد تصدیق کے لیے مکمل ریکارڈ بنائیں۔ اس پیش نظارے میں فرضی معلومات دیں۔',
        )}
        action={
          <button
            className="secondary"
            onClick={() =>
              toast(
                t(
                  'Your draft stays in this page while it is open.',
                  'صفحہ کھلا رہنے تک مسودہ یہیں محفوظ ہے۔',
                ),
              )
            }
          >
            {t('Keep draft', 'مسودہ رکھیں')}
          </button>
        }
      />
      <Steps
        current={step}
        items={[
          t('Details', 'تفصیلات'),
          t('Location', 'مقام'),
          t('Imam', 'امام'),
          t('Timings', 'اوقات'),
          t('Review', 'جائزہ'),
        ]}
      />
      <Panel>
        <form
          className="stack"
          onInput={() => setDirty(true)}
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 4) {
              setStep(step + 1);
              return;
            }
            const id = uid('mosque');
            const venue: Venue = {
              id,
              name: values.name,
              kind: values.kind === 'Prayer ground' ? 'Prayer ground' : 'Mosque',
              parentVenueId: values.parentVenueId || undefined,
              urdu: values.urdu || values.name,
              area: values.area,
              address: values.address,
              distance: 0,
              lat: Number(values.lat),
              lng: Number(values.lng),
              status: 'Draft',
              times: Object.fromEntries(daily.map((p) => [p, values[p]])),
              special: [],
              rep: role === 'representative' ? actor : '',
              focal: db.areas.find((a) => a.name === values.area)?.focal || '',
              revision: 1,
              reconfirmed: '',
              phoneVerified: '',
              facilities: {
                'Wudu area': values.wudu || 'Unknown',
                'Women’s space': values.women || 'Unknown',
                'Wheelchair access': values.access || 'Unknown',
                Parking: values.parking || 'Unknown',
              },
              image: 0,
            };
            const req: RequestRecord = {
              id: uid('REG'),
              token: crypto.randomUUID(),
              kind: 'registration',
              title: values.name,
              status: 'Submitted',
              values: {
                ...values,
                author: actor,
                venue: id,
                contactPermission: String(permission),
              },
              created: new Date().toISOString(),
            };
            update((d) => ({
              ...d,
              venues: [...d.venues, venue],
              requests: [req, ...d.requests],
              audit: [
                {
                  id: uid('A'),
                  action: 'Mosque registration submitted',
                  actor,
                  at: new Date().toISOString(),
                  target: id,
                },
                ...d.audit,
              ],
            }));
            toast(
              t(
                'Registration saved for review. The mosque is not public.',
                'اندراج جائزے کے لیے محفوظ ہے۔ مسجد عوامی نہیں۔',
              ),
            );
            allowLeave();
            navigate('/manage/mosques/' + id);
          }}
        >
          {step === 0 && (
            <>
              <h2>{t('Mosque details', 'مسجد کی تفصیلات')}</h2>
              <Field label={t('Venue type', 'مقام کی قسم')}>
                <select
                  value={values.kind || 'Mosque'}
                  onChange={(e) => setValues({ ...values, kind: e.target.value })}
                >
                  <option>Mosque</option>
                  <option>Prayer ground</option>
                </select>
              </Field>
              {values.kind === 'Prayer ground' && (
                <Field label={t('Associated mosque', 'متعلقہ مسجد')}>
                  <select
                    required
                    value={values.parentVenueId || ''}
                    onChange={(e) =>
                      setValues({ ...values, parentVenueId: e.target.value })
                    }
                  >
                    <option value="">Select mosque</option>
                    {db.venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="two-grid">
                {field('name', 'Mosque name', 'مسجد کا نام')}
                {field(
                  'urdu',
                  'Urdu name (optional)',
                  'اردو نام (اختیاری)',
                  'text',
                  false,
                )}
              </div>
              <Field label={t('Area', 'علاقہ')}>
                <select value={values.area} onChange={(e) => set('area', e.target.value)}>
                  {db.areas
                    .filter((a) => role === 'admin' || a.focal === 'focal-1')
                    .map((a) => (
                      <option key={a.name}>{a.name}</option>
                    ))}
                </select>
              </Field>
              {duplicates.length > 0 && (
                <Alert tone="warning">
                  {t(
                    'Possible duplicates. Review existing listings first:',
                    'ممکنہ دہرے اندراجات۔ پہلے موجودہ ریکارڈ دیکھیں:',
                  )}
                  {duplicates.map((v) => (
                    <Link className="text-link" to={'/manage/mosques/' + v.id} key={v.id}>
                      {v.name}
                    </Link>
                  ))}
                </Alert>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <h2>{t('Location & entrance', 'مقام اور داخلی دروازہ')}</h2>
              {field(
                'address',
                'Street address / entrance instructions',
                'پتہ / داخلی دروازے کی ہدایات',
              )}
              <MapPreview items={[]} />
              <div className="two-grid">
                <Field label={t('Entrance latitude', 'داخلی دروازے کا عرض البلد')}>
                  <input
                    type="number"
                    required
                    min="-90"
                    max="90"
                    step="any"
                    value={values.lat || ''}
                    onChange={(e) => set('lat', e.target.value)}
                  />
                </Field>
                <Field label={t('Entrance longitude', 'داخلی دروازے کا طول البلد')}>
                  <input
                    type="number"
                    required
                    min="-180"
                    max="180"
                    step="any"
                    value={values.lng || ''}
                    onChange={(e) => set('lng', e.target.value)}
                  />
                </Field>
              </div>
              <Alert>
                {t(
                  'Use the actual entrance coordinates, including a separate entrance for prayer grounds. The map above is illustrative.',
                  'اصل داخلی دروازے کے مختصات دیں۔ اوپر کا نقشہ نمونہ ہے۔',
                )}
              </Alert>
            </>
          )}
          {step === 2 && (
            <>
              <h2>{t('Private Imam contact', 'امام کا نجی رابطہ')}</h2>
              <Alert>
                {t(
                  'Use fictional contact details. The production record is private and requires independent verification.',
                  'فرضی رابطہ درج کریں۔ اصل ریکارڈ نجی ہوگا اور آزاد تصدیق ضروری ہے۔',
                )}
              </Alert>
              {field('imam', 'Registered Imam name', 'رجسٹرڈ امام کا نام')}
              {field('phone', 'Verification phone', 'تصدیقی فون', 'tel')}
              {field(
                'relationship',
                'Representative relationship to mosque',
                'نمائندے کا مسجد سے تعلق',
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  required
                  checked={permission}
                  onChange={(e) => setPermission(e.target.checked)}
                />
                {t(
                  'Permission to contact the Imam for service verification has been obtained.',
                  'سروس کی تصدیق کے لیے امام سے رابطے کی اجازت حاصل ہے۔',
                )}
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <h2>{t('Initial timetable & facilities', 'ابتدائی اوقات اور سہولیات')}</h2>
              <div className="three-grid">
                {daily.map((p) => (
                  <Field key={p} label={p + ' Jama’at'}>
                    <input
                      type="time"
                      required
                      value={values[p]}
                      onInput={(e) => set(p, e.currentTarget.value)}
                    />
                  </Field>
                ))}
              </div>
              <div className="two-grid">
                {[
                  ['wudu', 'Wudu area', 'وضو کی جگہ'],
                  ['women', 'Women’s space', 'خواتین کی جگہ'],
                  ['access', 'Wheelchair access', 'وہیل چیئر کی رسائی'],
                  ['parking', 'Parking', 'پارکنگ'],
                ].map(([key, en, ur]) => (
                  <Field key={key} label={t(en, ur)}>
                    <select
                      value={values[key] || 'Unknown'}
                      onChange={(e) => set(key, e.target.value)}
                    >
                      {['Unknown', 'Available', 'Unavailable'].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h2>{t('Review registration', 'اندراج کا جائزہ')}</h2>
              <div className="two-grid">
                <div>
                  <h3>{values.name}</h3>
                  <p>{values.address}</p>
                  <p>
                    {values.area}, {values.city}
                  </p>
                  <p>
                    {values.lat}, {values.lng}
                  </p>
                </div>
                <div>
                  <h3>{t('Private verification contact', 'نجی تصدیقی رابطہ')}</h3>
                  <p>{values.imam}</p>
                  <p>{values.phone}</p>
                  <Badge>{t('Contact permission recorded', 'رابطے کی اجازت درج')}</Badge>
                </div>
              </div>
              <Timetable times={Object.fromEntries(daily.map((p) => [p, values[p]]))} />
              <label className="checkbox">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {t(
                  'I checked these details and understand this registration remains unpublished until an independent reviewer verifies it and the initial timetable.',
                  'میں نے تفصیلات دیکھی ہیں۔ آزاد نگران کی تصدیق سے پہلے یہ شائع نہیں ہوگا۔',
                )}
              </label>
            </>
          )}
          <div className="form-actions">
            {step > 0 && (
              <button
                type="button"
                className="secondary"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={17} />
                {t('Back', 'واپس')}
              </button>
            )}
            <button type="submit">
              {t(
                step === 4 ? 'Submit registration for verification' : 'Continue',
                step === 4 ? 'اندراج تصدیق کے لیے بھیجیں' : 'آگے بڑھیں',
              )}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
