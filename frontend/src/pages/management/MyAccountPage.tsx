import { LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { roleNames } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';

export function MyAccount() {
  const { db, actor, role, t, toast } = useApp();
  const a = db.accounts.find((a) => a.id === actor)!;
  return (
    <>
      <PageTitle title={t('My account & security', 'میرا اکاؤنٹ اور حفاظت')} />
      <div className="two-grid">
        <Panel title={t('Your assigned role', 'آپ کا مقررہ کردار')}>
          <div className="avatar large-avatar">{a.name[0]}</div>
          <h2>{a.name}</h2>
          <dl>
            <dt>{t('Account contact number', 'اکاؤنٹ کا رابطہ نمبر')}</dt>
            <dd>
              {a.contactNumber ||
                t('Not provided in this sample account', 'اس نمونہ اکاؤنٹ میں درج نہیں')}
            </dd>
            <dt>{t('Number verification', 'نمبر کی تصدیق')}</dt>
            <dd>
              {a.contactVerifiedAt ||
                t('Not verified by a live service', 'حقیقی سروس سے تصدیق نہیں ہوئی')}
            </dd>
          </dl>
          <p>{roleNames[role!]}</p>
          <Badge>{a.area}</Badge>
          <Alert>
            {t(
              'Your role and scope are assigned by authorized management. You cannot promote your own account.',
              'آپ کا کردار اور دائرہ مجاز انتظامیہ طے کرتی ہے۔ آپ خود اپنا کردار نہیں بڑھا سکتے۔',
            )}
          </Alert>
        </Panel>
        <Panel title={t('Change password', 'پاس ورڈ تبدیل کریں')}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              toast(
                t(
                  'Password changes require the authentication API. No credentials were stored.',
                  'پاس ورڈ کی تبدیلی کے لیے تصدیقی API ضروری ہے۔ کوئی پاس ورڈ محفوظ نہیں ہوا۔',
                ),
              );
            }}
          >
            <Field label={t('Current password', 'موجودہ پاس ورڈ')}>
              <input type="password" autoComplete="current-password" required />
            </Field>
            <Field label={t('New password', 'نیا پاس ورڈ')}>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </Field>
            <button>
              <LockKeyhole size={17} />
              {t('Update password', 'پاس ورڈ بدلیں')}
            </button>
          </form>
          <Link className="text-link spaced" to="/recovery">
            {t('Recover account access', 'اکاؤنٹ کی رسائی بحال کریں')}
          </Link>
        </Panel>
      </div>
    </>
  );
}
