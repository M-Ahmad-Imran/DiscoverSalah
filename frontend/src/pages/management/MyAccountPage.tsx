import { LockKeyhole } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { roleNames } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';
import { api } from '../../services/api';

export function MyAccount() {
  const { db, actor, role, t, toast, restoreSession, refresh } = useApp();
  const navigate = useNavigate();
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
            <dd>{a.contactNumber || t('Not recorded', 'درج نہیں')}</dd>
            <dt>{t('Contact confirmation by issuer', 'نمبر کی تصدیق')}</dt>
            <dd>
              {a.contactConfirmedAt ||
                a.contactVerifiedAt ||
                t('Not confirmed by issuer', 'حقیقی سروس سے تصدیق نہیں ہوئی')}
            </dd>
          </dl>
          <p>{tr(roleNames[role!])}</p>
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
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api('/auth/change-password', {
                  currentPassword: f.get('current'),
                  newPassword: f.get('password'),
                });
                await restoreSession();
                await refresh();
                navigate('/sign-in');
              } catch (e) {
                toast((e as Error).message);
              }
            }}
          >
            <Field label={t('Current password', 'موجودہ پاس ورڈ')}>
              <input
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label={t('New password', 'نیا پاس ورڈ')}>
              <input
                name="password"
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
