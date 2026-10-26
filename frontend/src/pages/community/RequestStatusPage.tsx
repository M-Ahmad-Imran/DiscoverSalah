import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';
import { api } from '../../services/api';
interface Status {
  id: string;
  title: string;
  status: string;
  kind: string;
  createdAt: string;
  response?: string;
}
export function RequestStatus({ receipt = false }: { receipt?: boolean }) {
  useApp();
  const location = useLocation();
  const [token, setToken] = useState(
    (location.state as { token?: string } | null)?.token || '',
  );
  const [record, setRecord] = useState<Status | null>(null),
    [error, setError] = useState('');
  async function lookup() {
    try {
      setRecord(await api<Status>('/request-access', { token }));
      setError('');
    } catch (e) {
      setRecord(null);
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (receipt && token) void lookup();
  }, []);
  return (
    <div className="container narrow">
      <Panel>
        <h1>{receipt ? tr('Request receipt') : tr('Track your request')}</h1>
        <p>
          {tr(
            'Keep your private access token. It is not saved in browser storage or the URL.',
          )}{' '}
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
        >
          <Field label={tr('Private access token')}>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              required
            />
          </Field>
          <button>{tr('View status')}</button>
        </form>
        {error && <Alert tone="warning">{error}</Alert>}
        {record && (
          <>
            <h2>{record.title}</h2>
            <p>{tr(record.status)}</p>
            <p>
              {tr('Reference:')} {record.id}
            </p>
            {receipt && (
              <p className="break-all">
                {tr('Private token:')} {token}
              </p>
            )}
            <p>{record.response}</p>
            {record.kind === 'application' &&
              !['Approved', 'Rejected', 'Withdrawn'].includes(record.status) && (
                <button
                  onClick={async () => {
                    try {
                      await api('/my-request/withdraw', { token });
                      await lookup();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {tr('Withdraw application')}{' '}
                </button>
              )}
          </>
        )}
        <Link to="/">{tr('Back to discovery')}</Link>
      </Panel>
    </div>
  );
}
