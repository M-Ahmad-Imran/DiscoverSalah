import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';
import { api, getChallenge, setChallenge } from '../../services/api';
export function AuthSupport({
  mode,
}: {
  mode: 'recovery' | 'reset' | 'invite' | 'mfa' | 'expired' | 'denied';
}) {
  const { account, restoreSession, refresh } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  if (['recovery', 'invite', 'expired', 'denied'].includes(mode))
    return (
      <div className="container narrow">
        <Panel>
          <h1>{tr('Account access')}</h1>
          <p>
            {mode === 'recovery' || mode === 'invite'
              ? tr(
                  'Your issuing focal person (for representatives) or administrator (for focal persons) supplies credentials and password resets. No SMS code is required.',
                )
              : tr('Please sign in with an account authorized for this workspace.')}
          </p>
          <Link to="/sign-in">{tr('Sign in')}</Link>
        </Panel>
      </div>
    );
  return (
    <div className="container narrow">
      <Panel>
        <h1>
          {mode === 'mfa' ? tr('Administrator verification') : tr('Change your password')}
        </h1>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            const f = new FormData(e.currentTarget);
            try {
              if (mode === 'mfa') {
                if (!getChallenge())
                  throw new Error('Sign in again to begin administrator verification.');
                await api('/auth/mfa', {
                  challenge: getChallenge(),
                  code: String(f.get('code')),
                });
                setChallenge('');
                await restoreSession();
                await refresh();
                navigate('/manage');
              } else {
                if (!account)
                  throw new Error('Sign in with your temporary password first.');
                if (f.get('password') !== f.get('confirm'))
                  throw new Error('Passwords do not match.');
                await api('/auth/change-password', {
                  currentPassword: String(f.get('current')),
                  newPassword: String(f.get('password')),
                });
                await restoreSession();
                await refresh();
                navigate('/sign-in');
              }
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {mode === 'mfa' ? (
            <>
              <p>
                {tr(
                  'Use your authenticator code or an unused recovery code. Administrator MFA is separate from SMS verification.',
                )}{' '}
              </p>
              <Field label={tr('Authenticator or recovery code')}>
                <input name="code" autoComplete="one-time-code" required />
              </Field>
            </>
          ) : (
            <>
              <p>
                {tr(
                  'Choose a private password before managing records. Sign in again afterward.',
                )}{' '}
              </p>
              <Field label={tr('Current / temporary password')}>
                <input
                  name="current"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field label={tr('New password')}>
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label={tr('Confirm password')}>
                <input name="confirm" type="password" minLength={12} required />
              </Field>
            </>
          )}
          {error && <Alert tone="warning">{error}</Alert>}
          <button>{tr('Continue')}</button>
        </form>
      </Panel>
    </div>
  );
}
