import { useState } from 'react';
import { prayers } from '../../domain/constants';
import { canManage } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';
import type { Venue } from '../../types';
import { today } from '../../utils/date';
import { uid } from '../../utils/id';
import { Alert } from '../ui/Alert';
import { Field } from '../ui/Field';
import { Panel } from '../ui/Panel';

export function DisputePanel({ venue, reportId }: { venue: Venue; reportId: string }) {
  const { role, actor, update, t, toast } = useApp();
  const [prayer, setPrayer] = useState('Asr');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  if (!role || role === 'representative' || !canManage(role, venue, actor)) return null;
  const active =
    venue.disputes?.filter((d) => d.reportId === reportId && !d.resolved) || [];
  const record = (resolvedId?: string) => {
    if (reason.trim().length < 5) return;
    update((db) => ({
      ...db,
      venues: db.venues.map((v) => {
        if (v.id !== venue.id || !canManage(role, v, actor)) return v;
        const disputes = v.disputes || [];
        return {
          ...v,
          disputes: resolvedId
            ? disputes.map((d) => (d.id === resolvedId ? { ...d, resolved: true } : d))
            : [
                ...disputes,
                {
                  id: uid('D'),
                  prayer,
                  date,
                  reason: reason.trim(),
                  reportId,
                  recordedBy: actor,
                },
              ],
        };
      }),
      audit: [
        {
          id: uid('A'),
          actor,
          at: new Date().toISOString(),
          target: venue.id,
          action: `${resolvedId ? 'Dispute resolved' : 'Schedule scope disputed'} · ${reportId} · ${resolvedId || prayer + ' ' + date} · ${reason.trim()}`,
        },
        ...db.audit,
      ],
    }));
    setReason('');
    toast(
      t(
        'Investigation recorded. Official times remain unchanged.',
        'تحقیق درج ہو گئی۔ سرکاری اوقات تبدیل نہیں ہوئے۔',
      ),
    );
  };
  return (
    <Panel title={t('Investigated timing dispute', 'تحقیق شدہ اوقات کا تنازع')}>
      <Alert>
        {t(
          'Mark only the prayer and date supported by your investigation. A public report alone is not a verified finding. Resolving the report does not silently clear this flag.',
          'صرف تحقیق سے ثابت نماز اور تاریخ منتخب کریں۔ عوامی رپورٹ بذات خود تصدیق نہیں۔ رپورٹ حل کرنے سے یہ نشان خود نہیں ہٹتا۔',
        )}
      </Alert>
      <form
        className="stack spaced"
        onSubmit={(e) => {
          e.preventDefault();
          record();
        }}
      >
        <div className="two-grid">
          <Field label={t('Affected prayer', 'متاثرہ نماز')}>
            <select value={prayer} onChange={(e) => setPrayer(e.target.value)}>
              {prayers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label={t('Affected date', 'متاثرہ تاریخ')}>
            <input
              type="date"
              required
              value={date}
              onInput={(e) => setDate(e.currentTarget.value)}
            />
          </Field>
        </div>
        <Field label={t('Investigation or resolution reason', 'تحقیق یا حل کی وجہ')}>
          <textarea
            required
            minLength={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <button
          disabled={
            reason.trim().length < 5 ||
            active.some((d) => d.prayer === prayer && d.date === date)
          }
        >
          {t('Mark selected scope disputed', 'منتخب اوقات متنازع درج کریں')}
        </button>
        {active.map((d) => (
          <div className="list-row" key={d.id}>
            <span>
              {d.prayer} · {d.date}
            </span>
            <button
              type="button"
              className="secondary"
              disabled={reason.trim().length < 5}
              onClick={() => record(d.id)}
            >
              {t('Resolve dispute with reason', 'وجہ کے ساتھ تنازع حل کریں')}
            </button>
          </div>
        ))}
      </form>
    </Panel>
  );
}
