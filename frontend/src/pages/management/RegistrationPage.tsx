import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPreview } from '../../components/discovery/MapPreview';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Timetable } from '../../components/management/Timetable';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { RecordSelect } from '../../components/ui/RecordSelect';
import { Steps } from '../../components/ui/Steps';
import { daily } from '../../domain/constants';
import { canManage } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { tr } from '../../i18n/translate';
import { Venue } from '../../types/index';

export function Registration() {
  const { db, role, actor } = useApp();
  const { id } = useParams();
  const existing = id ? db.venues.find((v) => v.id === id) : undefined;
  const request = db.requests.find(
    (r) => r.kind === 'registration' && r.values.venue === id,
  );
  if (
    id &&
    (!existing ||
      !role ||
      !canManage(role, existing, actor) ||
      request?.status !== 'Returned' ||
      (existing.rep !== actor && request.values.author !== actor))
  ) {
    return <AccessDenied />;
  }
  return (
    <RegistrationForm
      key={id || 'new'}
      existing={existing}
      returnReason={request?.internalNotes}
    />
  );
}

function RegistrationForm({
  existing,
  returnReason,
}: {
  existing?: Venue;
  returnReason?: string;
}) {
  const { db, mutate, t, toast } = useApp();
  const navigate = useNavigate();
  // Capture the version being edited; background refresh must not silently rebase a draft.
  const [base] = useState(existing);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    city: db.areas[0]?.city || '',
    area: db.areas[0]?.name || '',
    kind: 'Mosque',
    Fajr: '05:20',
    Dhuhr: '13:30',
    Asr: '16:15',
    Maghrib: '17:40',
    Isha: '19:15',
    ...(base
      ? {
          name: base.name,
          urdu: base.urdu,
          area: base.area,
          city: base.city || '',
          kind: base.kind || 'Mosque',
          parentVenueId: base.parentVenueId || '',
          address: base.address,
          lat: String(base.lat),
          lng: String(base.lng),
          imam: base.contactName || '',
          phone: base.contactNumber || '',
          relationship: base.registrationRelationship || '',
          ...base.times,
          wudu: base.facilities['Wudu area'] || 'Unknown',
          women: base.facilities['Women’s space'] || 'Unknown',
          access: base.facilities['Wheelchair access'] || 'Unknown',
          parking: base.facilities.Parking || 'Unknown',
        }
      : {}),
  });
  const [dirty, setDirty] = useState(false);
  const allowLeave = useUnsavedChanges(dirty);
  const [permission, setPermission] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const set = (k: string, v: string) => setValues((current) => ({ ...current, [k]: v }));
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
    ? db.venues.filter(
        (v) =>
          v.id !== base?.id && v.name.toLowerCase().includes(values.name.toLowerCase()),
      )
    : [];
  return (
    <>
      <PageTitle
        title={
          base
            ? t('Correct returned registration', 'واپس کیے گئے اندراج کی اصلاح')
            : t('Register a mosque', 'مسجد درج کریں')
        }
        description={t(
          'Build a complete record for independent registration and timetable verification. Provide accurate details for independent review.',
          'آزاد تصدیق کے لیے مکمل ریکارڈ بنائیں۔ درست معلومات فراہم کریں۔',
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
      {base && (
        <Alert tone="warning">
          <strong>{t('Reviewer feedback', 'نگران کی ہدایات')}</strong>
          <p>
            {returnReason ||
              t(
                'Review all registration details before resubmitting.',
                'دوبارہ بھیجنے سے پہلے تمام تفصیلات دیکھیں۔',
              )}
          </p>
          <p>
            {t(
              'This mosque stays unpublished until an independent reviewer approves the corrected registration.',
              'آزاد نگران کی منظوری تک یہ مسجد شائع نہیں ہوگی۔',
            )}
          </p>
        </Alert>
      )}
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
          onSubmit={async (e) => {
            try {
              e.preventDefault();
              if (step < 4) {
                setStep(step + 1);
                return;
              }
              if (saving) return;
              setSaving(true);
              const saved = await mutate(
                base
                  ? `/management/registrations/${base.id}/resubmit`
                  : '/management/registrations',
                {
                  ...(base ? { revision: base.revision } : {}),
                  name: values.name,
                  urdu: values.urdu || values.name,
                  areaId:
                    base?.areaId || db.areas.find((a) => a.name === values.area)?.id,
                  address: values.address,
                  lat: Number(values.lat),
                  lng: Number(values.lng),
                  kind: values.kind,
                  ...(values.kind === 'Prayer ground' && values.parentVenueId
                    ? { parentVenueId: values.parentVenueId }
                    : {}),
                  facilities: {
                    ...base?.facilities,
                    'Wudu area': values.wudu || 'Unknown',
                    'Women’s space': values.women || 'Unknown',
                    'Wheelchair access': values.access || 'Unknown',
                    Parking: values.parking || 'Unknown',
                  },
                  relationship: values.relationship,
                  initial: {
                    times: Object.fromEntries(daily.map((p) => [p, values[p]])),
                    special: base?.special || [],
                    effective:
                      base?.initialEffective ||
                      new Date().toLocaleDateString('en-CA', {
                        timeZone: 'Asia/Karachi',
                      }),
                    reason: 'Initial registration timetable',
                  },
                  imam: { name: values.imam, contactNumber: values.phone, permission },
                },
              );
              toast(
                t(
                  'Registration saved for review. The mosque is not public.',
                  'اندراج جائزے کے لیے محفوظ ہے۔ مسجد عوامی نہیں۔',
                ),
              );
              allowLeave();
              navigate('/manage/mosques/' + saved.id);
            } catch {
              return;
            } finally {
              setSaving(false);
            }
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
                  <option value={'Mosque'}>{tr('Mosque')}</option>
                  <option value={'Prayer ground'}>{tr('Prayer ground')}</option>
                </select>
              </Field>
              {values.kind === 'Prayer ground' && (
                <Field label={t('Associated mosque', 'متعلقہ مسجد')}>
                  <RecordSelect
                    resource="venues"
                    kindFilter="Mosque"
                    areaFilter={values.area}
                    required
                    value={values.parentVenueId || ''}
                    onChange={(e) =>
                      setValues({ ...values, parentVenueId: e.target.value })
                    }
                  >
                    <option value="">{tr('Select mosque')}</option>
                    {db.venues
                      .filter(
                        (v) =>
                          v.id !== base?.id &&
                          v.kind !== 'Prayer ground' &&
                          v.area === values.area,
                      )
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </RecordSelect>
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
                <RecordSelect
                  resource="areas"
                  nameValue
                  disabled={!!base}
                  value={values.area}
                  onChange={(e) => set('area', e.target.value)}
                >
                  {db.areas.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </RecordSelect>
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
                  'Use the actual entrance coordinates, including a separate entrance for prayer grounds. Published directions will use these coordinates.',
                  'اصل داخلی دروازے کے مختصات دیں۔ شائع شدہ مسجد کا راستہ انہی مختصات سے کھلے گا۔',
                )}
              </Alert>
            </>
          )}
          {step === 2 && (
            <>
              <h2>{t('Private Imam contact', 'امام کا نجی رابطہ')}</h2>
              <Alert>
                {t(
                  'Provide the real authorized Imam contact. These details are private and require independent verification.',
                  'مجاز امام کا اصل رابطہ دیں۔ یہ معلومات نجی ہیں اور آزاد تصدیق ضروری ہے۔',
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
                        <option key={v} value={v}>
                          {tr(v)}
                        </option>
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
            <button type="submit" disabled={saving}>
              {t(
                saving
                  ? 'Submitting…'
                  : step === 4
                    ? base
                      ? 'Resubmit registration for verification'
                      : 'Submit registration for verification'
                    : 'Continue',
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
