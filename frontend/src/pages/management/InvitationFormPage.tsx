import { useState } from 'react';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { RecordSelect } from '../../components/ui/RecordSelect';
import { useApp } from '../../hooks/useApp';
import { displayDate, tr } from '../../i18n/translate';
export function InvitationForm() {
  const { db, role, actor, mutate } = useApp();
  const [result, setResult] = useState<{
      temporaryPassword: string;
      expiresAt: string;
    } | null>(null),
    [error, setError] = useState('');
  if (!role || role === 'representative') return <AccessDenied />;
  const assigned = role === 'admin' ? 'focal' : 'representative';
  return (
    <>
      <PageTitle
        title={
          assigned === 'focal'
            ? tr('Create focal-person credentials')
            : tr('Create representative credentials')
        }
      />
      <Panel>
        {result ? (
          <>
            <Alert>
              {tr(
                'Credentials created. Privately hand this password to the account owner. It expires in 24 hours and must be changed on first login.',
              )}{' '}
            </Alert>
            <p className="break-all">
              <strong>{result.temporaryPassword}</strong>
            </p>
            <p>
              {tr('Expires:')} {displayDate(result.expiresAt, true)}
            </p>
            <button onClick={() => setResult(null)}>
              {tr('I have handed over the credentials')}{' '}
            </button>
          </>
        ) : (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                setResult(
                  await mutate('/management/credentials', {
                    name: f.get('name'),
                    contactNumber: f.get('phone'),
                    role: assigned,
                    areaIds: [f.get('area')],
                    contactConfirmed: true,
                    reason: f.get('reason'),
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Field label={tr('Full name')}>
              <input name="name" required />
            </Field>
            <Field label={tr('Contact number')}>
              <input name="phone" type="tel" required />
            </Field>
            <Field label={tr('Assigned area')}>
              <RecordSelect resource="areas" name="area" required>
                <option value="">{tr('Select area')}</option>
                {db.areas
                  .filter((a) => role === 'admin' || a.focal === actor)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </RecordSelect>
            </Field>
            <Field label={tr('Reason / reference checks')}>
              <textarea name="reason" minLength={5} required />
            </Field>
            <label className="checkbox">
              <input type="checkbox" required />
              {tr(
                "I confirmed this person's contact details and authority independently.",
              )}{' '}
            </label>
            <Alert>
              {tr(
                'No SMS OTP is used. The server enforces who may create each role.',
              )}{' '}
            </Alert>
            {error && <Alert tone="warning">{error}</Alert>}
            <button>{tr('Create credentials')}</button>
          </form>
        )}
      </Panel>
    </>
  );
}
