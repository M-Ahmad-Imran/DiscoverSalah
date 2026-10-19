import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { uid } from '../../utils/id';

export function PublicForm({
  kind,
}: {
  kind: 'report' | 'suggestion' | 'application' | 'contact';
}) {
  const { db, update, t } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({
    venue: params.get('venue') || db.venues[0]?.id,
    role: params.get('role') || 'representative',
    area: 'Gulberg III',
    category: 'Timing',
    prayer: params.get('prayer') || '',
    date: params.get('date') || '',
  });
  const [consent, setConsent] = useState(false);
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const titles = {
    report: ['Report incorrect information', 'غلط معلومات کی اطلاع'],
    suggestion: ['Suggest a missing mosque', 'غیر موجود مسجد تجویز کریں'],
    application: ['Apply to contribute', 'رضاکار بننے کی درخواست'],
    contact: ['Contact & support', 'رابطہ اور مدد'],
  };
  const input = (
    name: string,
    en: string,
    ur: string,
    type = 'text',
    required = true,
  ) => (
    <Field key={name} label={t(en, ur)}>
      <input
        type={type}
        value={values[name] || ''}
        onChange={(e) => set(name, e.target.value)}
        required={required}
        maxLength={300}
      />
    </Field>
  );
  const matches =
    kind === 'suggestion' && values.name
      ? db.venues.filter((v) => v.name.toLowerCase().includes(values.name.toLowerCase()))
      : [];
  return (
    <div className="container narrow">
      <PageTitle
        eyebrow={t('COMMUNITY SUPPORT', 'کمیونٹی کی مدد')}
        title={t(titles[kind][0], titles[kind][1])}
        description={t(
          'This preview saves sample requests on this device only. Please use fictional contact details.',
          'یہ پیش نظارہ صرف اس ڈیوائس پر نمونہ درخواست محفوظ کرتا ہے۔ فرضی رابطہ استعمال کریں۔',
        )}
      />
      <Panel>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const id = uid('REQ'),
              token = crypto.randomUUID();
            update((d) => ({
              ...d,
              requests: [
                {
                  id,
                  token,
                  kind,
                  title:
                    values.name ||
                    values.subject ||
                    (kind === 'report'
                      ? `${values.category} report`
                      : 'Contributor application'),
                  values,
                  status: kind === 'report' ? 'Open' : 'Submitted',
                  created: new Date().toISOString(),
                },
                ...d.requests,
              ],
            }));
            navigate(`/receipt/${id}?token=${token}`);
          }}
        >
          {kind === 'report' && (
            <>
              <Field label={t('Mosque', 'مسجد')}>
                <select
                  value={values.venue}
                  onChange={(e) => set('venue', e.target.value)}
                >
                  {db.venues.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('What needs checking?', 'کیا درست کرنا ہے؟')}>
                <select
                  value={values.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  {['Timing', 'Location', 'Duplicate listing', 'Facilities', 'Other'].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </select>
              </Field>
              {input(
                'prayer',
                'Prayer / session (optional)',
                'نماز / جماعت (اختیاری)',
                'text',
                false,
              )}
              {input(
                'date',
                'Date affected (optional)',
                'متاثرہ تاریخ (اختیاری)',
                'date',
                false,
              )}
            </>
          )}
          {kind === 'suggestion' && (
            <>
              {input('name', 'Mosque name', 'مسجد کا نام')}
              <Field label={t('City', 'شہر')}>
                <select>
                  <option>Lahore</option>
                </select>
              </Field>
              {input(
                'address',
                'Address or entrance description',
                'پتہ یا داخلی دروازے کی تفصیل',
              )}
              {matches.length > 0 && (
                <Alert tone="warning">
                  {t(
                    'Possible existing matches — check before submitting:',
                    'ممکنہ موجودہ اندراجات — پہلے دیکھیں:',
                  )}
                  {matches.map((v) => (
                    <Link className="text-link" key={v.id} to={'/mosque/' + v.id}>
                      {v.name}
                    </Link>
                  ))}
                </Alert>
              )}
            </>
          )}
          {kind === 'application' && (
            <>
              {input('name', 'Full name', 'پورا نام')}
              <Field
                label={t(
                  'Role you are interested in',
                  'آپ کس کردار میں دلچسپی رکھتے ہیں',
                )}
              >
                <select value={values.role} onChange={(e) => set('role', e.target.value)}>
                  <option value="representative">
                    {t('Local Representative', 'مقامی نمائندہ')}
                  </option>
                  <option value="focal">{t('Focal Person', 'فوکل پرسن')}</option>
                </select>
              </Field>
              {input('affiliation', 'Mosque affiliation', 'مسجد سے تعلق')}
              {input('availability', 'Availability / time commitment', 'دستیابی / وقت')}
              {input('reference', 'Independent mosque reference', 'مسجد کا آزاد حوالہ')}
            </>
          )}
          {(kind === 'application' || kind === 'suggestion') && (
            <Field label={t('Area', 'علاقہ')}>
              <select value={values.area} onChange={(e) => set('area', e.target.value)}>
                {db.areas.map((a) => (
                  <option key={a.name}>{a.name}</option>
                ))}
              </select>
            </Field>
          )}
          {kind === 'contact' && input('subject', 'Subject', 'موضوع')}
          {input(
            kind === 'application' ? 'contactNumber' : 'email',
            kind === 'application'
              ? 'Private contact number'
              : 'Contact email (optional)',
            kind === 'application' ? 'ذاتی رابطہ نمبر' : 'رابطہ ای میل (اختیاری)',
            kind === 'application' ? 'tel' : 'email',
            kind === 'application',
          )}
          <Field
            label={t(
              kind === 'application' ? 'Why would you like to help?' : 'Details',
              kind === 'application' ? 'آپ تعاون کیوں کرنا چاہتے ہیں؟' : 'تفصیلات',
            )}
          >
            <textarea
              rows={5}
              value={values.description || ''}
              onChange={(e) => set('description', e.target.value)}
              required
              maxLength={2000}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            {t(
              'I permit contact about this request and understand that submission starts a review, not publication or account activation.',
              'میں اس درخواست کے بارے میں رابطے کی اجازت دیتا ہوں۔ درخواست سے اشاعت یا اکاؤنٹ فعال نہیں ہوتا۔',
            )}
          </label>
          <button disabled={!consent} type="submit">
            {t('Submit request', 'درخواست جمع کریں')}
            <ArrowRight size={18} />
          </button>
          <Link to="/track" className="text-link">
            {t(
              'Already submitted? Track your request',
              'درخواست پہلے جمع کی؟ حیثیت دیکھیں',
            )}
          </Link>
        </form>
      </Panel>
    </div>
  );
}
