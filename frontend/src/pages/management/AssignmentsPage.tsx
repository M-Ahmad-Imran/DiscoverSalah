import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import {
  applyAssignment,
  assignmentError,
  type AssignmentInput,
} from '../../domain/assignments';
import { useApp } from '../../hooks/useApp';
import { uid } from '../../utils/id';

export function Assignments() {
  const { db, role, actor, update, t, toast } = useApp();
  const [params] = useSearchParams();
  const [operation, setOperation] = useState<AssignmentInput['operation']>(
    params.get('area') ? 'focal' : 'representative',
  );
  const [target, setTarget] = useState(params.get('area') || db.venues[0]?.id);
  const [assignee, setAssignee] = useState(params.get('account') || '');
  const [reason, setReason] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  if (role !== 'admin' && role !== 'focal') return <AccessDenied />;
  return (
    <>
      <PageTitle
        title={t('Assignments & backup coverage', 'ذمہ داریاں اور متبادل نگرانی')}
        description={t(
          'Keep every mosque connected to an accountable representative and independent reviewer.',
          'ہر مسجد کو ذمہ دار نمائندے اور آزاد نگران سے منسلک رکھیں۔',
        )}
      />
      {error && <Alert tone="warning">{error}</Alert>}
      <Panel title={t('Assignment operation', 'ذمہ داری کی کارروائی')}>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!consent) return;
            const input = {
              operation,
              target,
              assignee,
              reason,
              startsAt: startsAt ? startsAt + ':00+05:00' : '',
              endsAt: endsAt ? endsAt + ':00+05:00' : '',
            };
            const invalid = assignmentError(db, role, actor, input);
            if (invalid) {
              setError(invalid);
              return;
            }
            update((d) => applyAssignment(d, role, actor, input, uid('A')));
            setError('');
            toast(t('Assignment saved in this preview.', 'نمونہ ذمہ داری محفوظ ہو گئی۔'));
            setConsent(false);
          }}
        >
          <div className="two-grid">
            <Field label={t('Operation', 'کارروائی')}>
              <select
                value={operation}
                onChange={(e) => {
                  setOperation(e.target.value as AssignmentInput['operation']);
                  setTarget(
                    e.target.value === 'focal'
                      ? db.areas[0]?.name || ''
                      : db.venues.find((v) => role === 'admin' || v.focal === actor)
                          ?.id || '',
                  );
                  setAssignee('');
                }}
              >
                <option value="representative">Replace representative</option>
                {role === 'admin' && (
                  <option value="focal">Assign primary Focal Person</option>
                )}
                {role === 'admin' && (
                  <option value="backup">Temporary backup reviewer</option>
                )}
              </select>
            </Field>
            <Field label={t('Target mosque or area', 'مسجد یا علاقہ')}>
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {operation === 'focal'
                  ? db.areas.map((a) => <option key={a.name}>{a.name}</option>)
                  : db.venues
                      .filter((v) => role === 'admin' || v.focal === actor)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
              </select>
            </Field>
          </div>
          <Field label={t('Authorized assignee', 'مجاز ذمہ دار')}>
            <select
              required
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">
                {t('Choose an active account', 'فعال اکاؤنٹ منتخب کریں')}
              </option>
              {db.accounts
                .filter(
                  (a) =>
                    a.active &&
                    a.role ===
                      (operation === 'representative' ? 'representative' : 'focal'),
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.area}
                  </option>
                ))}
            </select>
          </Field>
          {operation === 'backup' && (
            <div className="two-grid">
              <Field label={t('Starts at (Pakistan time)', 'آغاز (پاکستانی وقت)')}>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onInput={(e) => setStartsAt(e.currentTarget.value)}
                />
              </Field>
              <Field label={t('Ends at (Pakistan time)', 'اختتام (پاکستانی وقت)')}>
                <input
                  type="datetime-local"
                  required
                  value={endsAt}
                  onInput={(e) => setEndsAt(e.currentTarget.value)}
                />
              </Field>
            </div>
          )}
          <Field label={t('Mandatory reason', 'ضروری وجہ')}>
            <textarea
              required
              minLength={5}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {t(
              'I understand that replacement changes access immediately and must preserve historical attribution.',
              'میں سمجھتا ہوں کہ تبدیلی فوراً رسائی بدلتی ہے اور پرانی تاریخ محفوظ رہے گی۔',
            )}
          </label>
          <button disabled={!consent}>
            {t('Commit assignment', 'ذمہ داری درج کریں')}
          </button>
        </form>
      </Panel>
      {role === 'admin' && (
        <Panel title={t('Recorded backup coverage', 'درج متبادل نگرانی')}>
          <p>
            {t(
              'Coverage grants timetable review only. It expires at the recorded end time; independent verification still applies.',
              'متبادل نگرانی صرف اوقات کے جائزے کے لیے ہے۔ مقررہ اختتام پر ختم ہوگی اور آزاد تصدیق لازم ہے۔',
            )}
          </p>
          {db.venues.filter((v) => v.backup).length === 0 && (
            <p>{t('No backup coverage recorded.', 'کوئی متبادل نگرانی درج نہیں۔')}</p>
          )}
          {db.venues
            .filter((v) => v.backup)
            .map((v) => (
              <div className="list-row" key={v.id}>
                <div>
                  <strong>{v.name}</strong>
                  <p>
                    {db.accounts.find((a) => a.id === v.backup!.reviewer)?.name ||
                      v.backup!.reviewer}
                  </p>
                  <p dir="ltr">
                    {v.backup!.startsAt} → {v.backup!.endsAt}
                  </p>
                  <p>{v.backup!.reason}</p>
                </div>
                <button
                  className="secondary danger-text"
                  onClick={() => {
                    if (
                      !window.confirm(
                        t(
                          'Revoke this backup assignment now?',
                          'یہ متبادل ذمہ داری ابھی ختم کریں؟',
                        ),
                      )
                    )
                      return;
                    update((d) => ({
                      ...d,
                      venues: d.venues.map((x) =>
                        x.id === v.id ? { ...x, backup: undefined } : x,
                      ),
                      audit: [
                        {
                          id: uid('A'),
                          actor,
                          target: v.id,
                          at: new Date().toISOString(),
                          action: 'Backup coverage revoked · ' + v.backup!.reviewer,
                        },
                        ...d.audit,
                      ],
                    }));
                    toast(t('Backup access revoked.', 'متبادل رسائی ختم ہو گئی۔'));
                  }}
                >
                  {t('Revoke coverage', 'نگرانی ختم کریں')}
                </button>
              </div>
            ))}
        </Panel>
      )}
    </>
  );
}
