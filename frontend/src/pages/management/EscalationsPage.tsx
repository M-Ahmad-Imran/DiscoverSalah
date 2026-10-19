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
import { uid } from '../../utils/id';

export function Escalations() {
  const { db, role, actor, update, t, toast } = useApp();
  const venues = useScopedVenues();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  if (role === 'representative') return <AccessDenied />;
  const pending = db.proposals.filter(
    (p) => p.state === 'Submitted' && venues.some((v) => v.id === p.venueId),
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
            onSubmit={(e) => {
              e.preventDefault();
              const p = pending.find((p) => p.id === target);
              if (!p) return;
              update((d) => ({
                ...d,
                audit: [
                  {
                    id: uid('A'),
                    action: 'Escalation · ' + p.id + ' · ' + reason,
                    actor,
                    at: new Date().toISOString(),
                    target: p.venueId,
                  },
                  ...d.audit,
                ],
                notifications: [
                  {
                    id: uid('N'),
                    title: 'Escalated review: ' + p.id,
                    href: '/manage/review/' + p.id,
                    role: 'admin',
                    read: false,
                  },
                  ...d.notifications,
                ],
              }));
              setReason('');
              toast(
                t(
                  'Escalation recorded. Approval remains pending.',
                  'حوالگی درج ہو گئی۔ منظوری زیر التوا ہے۔',
                ),
              );
            }}
          >
            <Field label={t('Submission', 'درخواست')}>
              <select required value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">
                  {t('Select a pending version', 'زیر التوا ورژن منتخب کریں')}
                </option>
                {pending.map((p) => (
                  <option key={p.id}>{p.id}</option>
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
                'This creates an in-app sample notification. External delivery and backup authorization require the backend.',
                'یہ نمونہ اندرونی اطلاع بنائے گا۔ بیرونی ترسیل اور متبادل اختیار کے لیے سرور ضروری ہے۔',
              )}
            </Alert>
          </form>
        </Panel>
      </div>
    </>
  );
}
