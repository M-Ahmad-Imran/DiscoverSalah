import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';

export function Escalations() {
  const { db, role, actor, mutate, t, toast } = useApp();
  const venues = useScopedVenues();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  if (role === 'representative') return <AccessDenied />;
  const pending = db.proposals.filter(
    (p) =>
      p.state === 'Submitted' &&
      (!db.page || db.page.ids.includes(p.id)) &&
      venues.some((v) => v.id === p.venueId),
  );
  const reports = db.requests.filter(
    (r) =>
      r.status === 'Escalated' &&
      (role === 'admin' || venues.some((v) => v.id === r.values.venue)),
  );
  return (
    <>
      <PageTitle
        title={t('Urgent work & escalation', 'فوری کام اور حوالگی')}
        description={t(
          'Escalation preserves independent verification. No response is never approval.',
          'حوالگی آزاد تصدیق برقرار رکھتی ہے۔ جواب نہ آنا منظوری نہیں۔',
        )}
      />
      <div className="detail-grid">
        <Panel title={t('Outstanding reviews', 'باقی جائزے')}>
          {pending.map((p) => (
            <Link className="list-row" to={'/manage/review/' + p.id} key={p.id}>
              <strong>
                {p.id} · {venues.find((v) => v.id === p.venueId)?.name}
              </strong>
              <span>{p.effective}</span>
            </Link>
          ))}
          {reports.map((r) => (
            <Link className="list-row" to={'/manage/requests/' + r.id} key={r.id}>
              {r.id} · {r.title}
            </Link>
          ))}
          {!pending.length && !reports.length && (
            <Empty title={t('No outstanding work', 'کوئی کام باقی نہیں')} />
          )}
        </Panel>
        <Panel title={t('Record an escalation', 'حوالگی درج کریں')}>
          <form
            className="stack"
            onSubmit={async (e) => {
              try {
                e.preventDefault();
                const p = pending.find((p) => p.id === target);
                if (!p) return;
                await mutate('/management/proposals/' + p.id + '/escalate', { reason });
                setReason('');
                toast(
                  t(
                    'Escalation recorded. Approval remains pending.',
                    'حوالگی درج ہو گئی۔ منظوری زیر التوا ہے۔',
                  ),
                );
              } catch {
                return;
              }
            }}
          >
            <Field label={t('Submission', 'درخواست')}>
              <select required value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">
                  {t('Select a pending version', 'زیر التوا ورژن منتخب کریں')}
                </option>
                {pending.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('Reason and urgency', 'وجہ اور فوری ضرورت')}>
              <textarea
                required
                minLength={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <button>{t('Record escalation', 'حوالگی درج کریں')}</button>
            <Alert>
              {t(
                'This queues an in-app notification for administrators without approving the submission.',
                'اس سے منتظمین کے لیے ایپ میں اطلاع قطار میں شامل ہوگی۔ درخواست کی منظوری نہیں ہوگی۔',
              )}
            </Alert>
          </form>
        </Panel>
      </div>
    </>
  );
}
