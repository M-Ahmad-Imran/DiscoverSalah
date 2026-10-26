import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { RecordSelect } from '../../components/ui/RecordSelect';
import { assignmentError, type AssignmentInput } from '../../domain/assignments';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';

export function Assignments() {
  const { db, role, actor, mutate, t, toast } = useApp();
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
          onSubmit={async (e) => {
            try {
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
              await mutate('/management/assignments', {
                operation: input.operation,
                targetId:
                  input.operation === 'focal'
                    ? db.areas.find((a) => a.name === input.target)?.id
                    : input.target,
                assigneeId: input.assignee,
                expectedRevision:
                  input.operation === 'focal'
                    ? db.areas.find((a) => a.name === input.target)?.revision
                    : db.venues.find((v) => v.id === input.target)?.revision,
                reason: input.reason,
                ...(input.operation === 'backup'
                  ? { startsAt: input.startsAt, endsAt: input.endsAt }
                  : {}),
              });
              setError('');
              toast(t('Assignment saved.', 'ذمہ داری محفوظ ہو گئی۔'));
              setConsent(false);
            } catch {
              return;
            }
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
                <option value="representative">{tr('Replace representative')}</option>
                {role === 'admin' && (
                  <option value="focal">{tr('Assign primary Focal Person')}</option>
                )}
                {role === 'admin' && (
                  <option value="backup">{tr('Temporary backup reviewer')}</option>
                )}
              </select>
            </Field>
            <Field label={t('Target mosque or area', 'مسجد یا علاقہ')}>
              <RecordSelect
                resource={operation === 'focal' ? 'areas' : 'venues'}
                nameValue={operation === 'focal'}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {operation === 'focal'
                  ? db.areas.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))
                  : db.venues
                      .filter((v) => role === 'admin' || v.focal === actor)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
              </RecordSelect>
            </Field>
          </div>
          <Field label={t('Authorized assignee', 'مجاز ذمہ دار')}>
            <RecordSelect
              resource="accounts"
              roleFilter={operation === 'representative' ? 'representative' : 'focal'}
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
            </RecordSelect>
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
                  onClick={async () => {
                    try {
                      if (
                        !window.confirm(
                          t(
                            'Revoke this backup assignment now?',
                            'یہ متبادل ذمہ داری ابھی ختم کریں؟',
                          ),
                        )
                      )
                        return;
                      await mutate('/management/assignments', {
                        operation: 'revoke-backup',
                        targetId: v.id,
                        expectedRevision: v.revision,
                        reason: 'Backup coverage revoked by administrator',
                      });
                      toast(t('Backup access revoked.', 'متبادل رسائی ختم ہو گئی۔'));
                    } catch {
                      return;
                    }
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
