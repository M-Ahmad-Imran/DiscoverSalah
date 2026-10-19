import { CheckCircle2, Copy, Search } from 'lucide-react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';

export function RequestStatus({ receipt = false }: { receipt?: boolean }) {
  const { db, update, t, toast } = useApp();
  const { id } = useParams();
  const [params] = useSearchParams();
  const [reference, setReference] = useState(id || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [lookup, setLookup] = useState(receipt);
  const record = lookup
    ? db.requests.find((r) => r.id === reference && r.token === token)
    : null;
  return (
    <div className="container narrow">
      <PageTitle
        title={t(
          receipt ? 'Your request is saved' : 'Track your request',
          receipt ? 'آپ کی درخواست محفوظ ہو گئی' : 'اپنی درخواست کی حیثیت دیکھیں',
        )}
        description={t(
          'Keep your reference and private access token. This is a local preview receipt.',
          'حوالہ اور نجی ٹوکن محفوظ رکھیں۔ یہ مقامی پیش نظارے کی رسید ہے۔',
        )}
      />
      {!record ? (
        <Panel>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              setLookup(true);
            }}
          >
            <Field label={t('Request reference', 'درخواست کا حوالہ')}>
              <input
                required
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  setLookup(false);
                }}
              />
            </Field>
            <Field label={t('Private access token', 'نجی رسائی ٹوکن')}>
              <input
                required
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setLookup(false);
                }}
              />
            </Field>
            {lookup && (
              <Alert tone="warning">
                {t(
                  'This reference and token could not be verified on this device.',
                  'اس ڈیوائس پر حوالہ اور ٹوکن کی تصدیق نہیں ہو سکی۔',
                )}
              </Alert>
            )}
            <button>
              <Search size={18} />
              {t('View status', 'حیثیت دیکھیں')}
            </button>
          </form>
        </Panel>
      ) : (
        <Panel>
          <div className="receipt-icon">
            <CheckCircle2 size={42} />
          </div>
          <h2>{record.title}</h2>
          <Badge tone={record.status === 'Approved' ? 'green' : 'amber'}>
            {record.status}
          </Badge>
          <dl className="definition-list">
            <dt>{t('Reference', 'حوالہ')}</dt>
            <dd>{record.id}</dd>
            <dt>{t('Private access token', 'نجی رسائی ٹوکن')}</dt>
            <dd className="break-all">{record.token}</dd>
            <dt>{t('Submitted', 'جمع شدہ')}</dt>
            <dd>{new Date(record.created).toLocaleString()}</dd>
          </dl>
          <button
            className="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${record.id}\n${record.token}`);
                toast(t('Reference and token copied', 'حوالہ اور ٹوکن کاپی ہو گئے'));
              } catch {
                toast(
                  t(
                    'Select and copy your reference above',
                    'اوپر حوالہ منتخب کر کے کاپی کریں',
                  ),
                );
              }
            }}
          >
            <Copy size={16} />
            {t('Copy access details', 'رسائی کی تفصیلات کاپی کریں')}
          </button>
          {record.response && <Alert>{record.response}</Alert>}
          {record.kind === 'application' &&
            !['Withdrawn', 'Rejected'].includes(record.status) && (
              <button
                className="secondary danger-text spaced"
                onClick={() => {
                  if (
                    window.confirm(
                      t('Withdraw this application?', 'یہ درخواست واپس لیں؟'),
                    )
                  )
                    update((d) => ({
                      ...d,
                      requests: d.requests.map((r) =>
                        r.id === record.id ? { ...r, status: 'Withdrawn' } : r,
                      ),
                    }));
                }}
              >
                {t('Withdraw application', 'درخواست واپس لیں')}
              </button>
            )}
          <Alert>
            {t(
              'Only the status of your own request is shown. Submission does not publish information or grant management access.',
              'صرف آپ کی درخواست کی حیثیت دکھائی جاتی ہے۔ درخواست سے انتظامی رسائی نہیں ملتی۔',
            )}
          </Alert>
          <ButtonLink to="/">{t('Back to discovery', 'تلاش پر واپس')}</ButtonLink>
        </Panel>
      )}
    </div>
  );
}
