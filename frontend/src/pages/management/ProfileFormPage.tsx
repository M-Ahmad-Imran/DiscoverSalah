import { Send } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { canManage } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';
import { uid } from '../../utils/id';

export function ProfileForm({ contact = false }: { contact?: boolean }) {
  const { id } = useParams();
  const { db, role, actor, update, t, toast } = useApp();
  const navigate = useNavigate();
  const v = db.venues.find((x) => x.id === id);
  if (!v || !role || !canManage(role, v, actor)) return <AccessDenied />;
  return (
    <>
      <PageTitle
        eyebrow={v.name}
        title={t(
          contact ? 'Request private contact change' : 'Edit mosque information',
          contact ? 'نجی رابطے کی تبدیلی' : 'مسجد کی معلومات میں ترمیم',
        )}
      />
      <Panel>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<
              string,
              string
            >;
            update((d) => ({
              ...d,
              requests: [
                {
                  id: uid('CHANGE'),
                  token: crypto.randomUUID(),
                  kind: contact ? 'contact-change' : 'profile-change',
                  title: v.name,
                  values: { ...values, venue: v.id, author: actor },
                  status: 'Submitted',
                  created: new Date().toISOString(),
                },
                ...d.requests,
              ],
            }));
            toast(
              t(
                'Change request saved for independent review. Public information is unchanged.',
                'تبدیلی آزاد جائزے کے لیے محفوظ ہے۔ عوامی معلومات تبدیل نہیں ہوئیں۔',
              ),
            );
            navigate('/manage/mosques/' + id);
          }}
        >
          {contact ? (
            <>
              <Alert tone="warning">
                {t(
                  'A new phone number cannot verify itself. Provide an established contact or independent mosque authority. Use synthetic data here.',
                  'نیا نمبر خود اپنی تصدیق نہیں کر سکتا۔ موجودہ معتبر رابطہ یا آزاد مسجد اتھارٹی دیں۔',
                )}
              </Alert>
              <Field label={t('New Imam contact name', 'امام کا نیا نام')}>
                <input name="name" required />
              </Field>
              <Field label={t('New private phone', 'نیا نجی فون')}>
                <input name="phone" type="tel" required />
              </Field>
              <Field
                label={t(
                  'Existing trusted contact / independent authority',
                  'موجودہ معتبر رابطہ / آزاد اتھارٹی',
                )}
              >
                <textarea name="reference" required rows={3} />
              </Field>
              <label className="checkbox">
                <input type="checkbox" name="consent" required />
                {t('Permission to contact has been obtained.', 'رابطے کی اجازت حاصل ہے۔')}
              </label>
            </>
          ) : (
            <>
              <div className="two-grid">
                <Field label={t('Mosque name', 'مسجد کا نام')}>
                  <input name="name" defaultValue={v.name} required />
                </Field>
                <Field label={t('Address', 'پتہ')}>
                  <input name="address" defaultValue={v.address} required />
                </Field>
              </div>
              <div className="two-grid">
                {Object.entries(v.facilities).map(([key, val]) => (
                  <Field key={key} label={key}>
                    <select name={'facility:' + key} defaultValue={val}>
                      {['Available', 'Unavailable', 'Unknown'].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <Alert>
                {t(
                  'Identity changes remain proposals until reviewed. This form does not modify prayer times.',
                  'شناخت کی تبدیلی جائزے تک تجویز رہے گی۔ یہ فارم نماز کے اوقات نہیں بدلتا۔',
                )}
              </Alert>
            </>
          )}
          <Field label={t('Reason for change', 'تبدیلی کی وجہ')}>
            <textarea name="reason" required minLength={5} rows={3} />
          </Field>
          <button type="submit">
            <Send size={17} />
            {t('Submit change request', 'تبدیلی کی درخواست بھیجیں')}
          </button>
        </form>
      </Panel>
    </>
  );
}
