import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { roleNames } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
import { displayDate, tr } from '../../i18n/translate';
export function AccountDetails() {
  const { id } = useParams();
  const { db, role, actor, t, mutate } = useApp();
  const [credentials, setCredentials] = useState<{
    temporaryPassword: string;
    expiresAt: string;
  } | null>(null);
  const account = db.accounts.find((a) => a.id === id);
  const venues = db.venues.filter(
    (v) => v.rep === id || v.focal === id || v.backup?.reviewer === id,
  );
  if (
    !account ||
    role === 'representative' ||
    (role !== 'admin' &&
      (account.role !== 'representative' ||
        !db.areas.some((a) => a.name === account.area && a.focal === actor)))
  )
    return <AccessDenied />;
  const visible = venues.filter((v) => role === 'admin' || v.focal === actor);
  return (
    <>
      <PageTitle
        title={account.name}
        description={roleNames[account.role] + ' · ' + account.area}
        action={<Badge tone={account.active ? 'green' : 'amber'}>{account.status}</Badge>}
      />
      {((role === 'admin' && account.role === 'focal') ||
        (role === 'focal' && account.role === 'representative')) &&
        account.active && (
          <Panel title={tr('Account credentials and contact')}>
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const f = new FormData(form);
                try {
                  await mutate('/management/accounts/' + account.id + '/contact', {
                    authVersion: account.authVersion,
                    contactNumber: f.get('contactNumber'),
                    reason: f.get('reason'),
                    contactConfirmed: true,
                  });
                  form.reset();
                } catch {
                  return;
                }
              }}
            >
              <Field label={tr('New account contact number')}>
                <input name="contactNumber" type="tel" required />
              </Field>
              <Field label={tr('Reason for contact change')}>
                <textarea name="reason" minLength={5} required />
              </Field>
              <label className="checkbox">
                <input type="checkbox" required />
                {tr(
                  'I independently confirmed the new contact number with the account owner.',
                )}{' '}
              </label>
              <button>{tr('Update contact and revoke sessions')}</button>
            </form>
            <h3>{tr('Reset credentials')}</h3>
            <p>
              {tr(
                "Confirm the account owner's identity and contact details before resetting. Existing sessions will be revoked.",
              )}{' '}
            </p>
            {credentials ? (
              <>
                <p className="break-all">
                  {tr('Temporary password:')} {credentials.temporaryPassword}
                </p>
                <p>
                  {tr('Expires:')} {displayDate(credentials.expiresAt, true)}
                </p>
                <button onClick={() => setCredentials(null)}>
                  {tr('Credentials handed over privately')}{' '}
                </button>
              </>
            ) : (
              <button
                onClick={async () => {
                  if (
                    !window.confirm(
                      'Identity and contact confirmed? Reset credentials and revoke sessions?',
                    )
                  )
                    return;
                  try {
                    setCredentials(
                      await mutate(
                        '/management/accounts/' + account.id + '/reset-credentials',
                        {
                          authVersion: account.authVersion,
                          reason:
                            'Owner identity and contact independently confirmed for recovery',
                          contactConfirmed: true,
                        },
                      ),
                    );
                  } catch {
                    return;
                  }
                }}
              >
                {tr('Issue temporary password')}{' '}
              </button>
            )}
          </Panel>
        )}
      <div className="detail-grid">
        <Panel title={t('Assignments & workload', 'ذمہ داریاں اور کام')}>
          <ButtonLink secondary to={'/manage/mosques?person=' + id}>
            {t('View assigned mosques', 'مقررہ مساجد دیکھیں')}
          </ButtonLink>
          <ButtonLink to={'/manage/assignments?account=' + id}>
            {t('Manage assignment', 'ذمہ داری کا انتظام')}
          </ButtonLink>
        </Panel>
        <Panel
          title={t('Account and assignment history', 'اکاؤنٹ اور ذمہ داری کی تاریخ')}
        >
          <ButtonLink secondary to={'/manage/history?person=' + id}>
            {t('View activity history', 'سرگرمیوں کی تاریخ دیکھیں')}
          </ButtonLink>
          <Link to="/manage/accounts">{t('Back to accounts', 'اکاؤنٹس پر واپس')}</Link>
        </Panel>
      </div>
    </>
  );
}
