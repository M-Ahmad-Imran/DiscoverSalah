import { Phone, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Timetable } from '../../components/management/Timetable';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { canReview, canViewVenue } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';

export function Verification() {
  const { id } = useParams();
  const { db, role, actor, mutate, t, toast } = useApp();
  const navigate = useNavigate();
  const p = db.proposals.find((x) => x.id === id);
  const v = db.venues.find((x) => x.id === p?.venueId);
  const [outcome, setOutcome] = useState('');
  const [person, setPerson] = useState('');
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [decision, setDecision] = useState('');
  const [openedRevision] = useState(v?.revision);
  if (!p || !v || !role || role === 'representative' || !canViewVenue(role, v, actor))
    return <AccessDenied />;
  const eligible = canReview(p, role, actor, v) && openedRevision === v.revision;
  const valid =
    eligible &&
    outcome === 'Confirmed as submitted' &&
    !!person &&
    !!when &&
    !!notes &&
    confirmed;
  const commit = async () => {
    try {
      if (!eligible || !canReview(p, role, actor, v)) {
        toast(
          t(
            'Version or authority changed. Reload this review.',
            'ورژن یا اختیار بدل گیا۔ جائزہ دوبارہ کھولیں۔',
          ),
        );
        setDecision('');
        return;
      }
      if (decision === 'Approved' && !valid) return;
      if (decision !== 'Approved' && !message.trim()) return;
      await mutate('/management/proposals/' + p.id + '/decision', {
        decision,
        expectedVersion: p.version,
        expectedVenueRevision: v.revision,
        publicReason: message || 'Confirmed with registered Imam',
        ...(outcome && when
          ? { evidence: { outcome, person, calledAt: when + ':00+05:00', notes } }
          : {}),
      });
      navigate('/manage/submissions/' + p.id);
    } catch {
      return;
    }
  };
  return (
    <>
      <PageTitle
        eyebrow={`${p.id} · v${p.version} · ${v.area}`}
        title={t(v.name, v.urdu)}
        description={t(
          'Verify the exact proposed version with the registered Imam.',
          'مجوزہ ورژن کی رجسٹرڈ امام سے تصدیق کریں۔',
        )}
        action={<Badge tone="amber">{p.state}</Badge>}
      />
      {!eligible && (
        <Alert tone="warning">
          {t(
            'This version cannot be approved: it is superseded, already decided, changed, or authored by you. Reload the queue.',
            'یہ ورژن منظور نہیں ہو سکتا: بدل گیا، فیصلہ ہو گیا یا آپ ہی مصنف ہیں۔',
          )}
        </Alert>
      )}
      <div className="detail-grid">
        <div className="stack">
          <Panel title={t('Timing comparisons', 'اوقات کا موازنہ')}>
            <div>
              <Timetable times={p.times} before={p.before} />
            </div>
            <h3>
              {t(
                'Dated and special session comparison',
                'تاریخ وار اور خصوصی جماعتوں کا موازنہ',
              )}
            </h3>
            <div className="two-grid">
              <div>
                <h4>{t('Before', 'پہلے')}</h4>
                {(p.beforeSpecial || v.special).map((s) => (
                  <p key={s.id}>
                    {tr(s.prayer)} · {s.date} · {s.time}
                    {tr('· Khutbah')} {s.khutbah || '—'}{' '}
                    {s.canceled ? tr('Canceled') : ''}
                  </p>
                ))}
              </div>
              <div>
                <h4>{t('Proposed', 'مجوزہ')}</h4>
                {p.special.map((s) => (
                  <p key={s.id}>
                    {tr(s.prayer)} · {s.date} · {s.time}
                    {tr('· Khutbah')} {s.khutbah || '—'}{' '}
                    {s.canceled ? tr('Canceled') : ''}{' '}
                    {s.provisional ? tr('Provisional') : ''}
                  </p>
                ))}
              </div>
            </div>
            <p>
              {t('Effective from', 'لاگو تاریخ')}: <strong>{p.effective}</strong>
            </p>
          </Panel>
          <Panel title={t('Representative justification', 'نمائندے کی وجہ')}>
            <p>{p.reason}</p>
          </Panel>
          <Panel title={t('Verification evidence', 'تصدیق کے شواہد')}>
            <fieldset disabled={!eligible}>
              <legend>{t('Call outcome', 'کال کا نتیجہ')}</legend>
              {[
                'Confirmed as submitted',
                'Details do not match',
                'No answer / unreachable',
                'Contact invalid / authority unclear',
                'Only some changes confirmed',
              ].map((o) => (
                <label className="radio-card" key={o}>
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === o}
                    onChange={() => setOutcome(o)}
                  />
                  {tr(o)}
                </label>
              ))}
              <div className="two-grid spaced">
                <Field label={t('Person spoken to', 'جس سے بات ہوئی')}>
                  <input value={person} onChange={(e) => setPerson(e.target.value)} />
                </Field>
                <Field label={t('Call date & time (PKT)', 'کال کی تاریخ اور وقت')}>
                  <input
                    type="datetime-local"
                    value={when}
                    onInput={(e) => setWhen(e.currentTarget.value)}
                  />
                </Field>
              </div>
              <Field label={t('Private verification notes', 'نجی تصدیقی نوٹس')}>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(
                    'Record the checked scope and outcome. Record the actual call details.',
                    'جن اوقات کی تصدیق کی گئی اور کال کا اصل نتیجہ درج کریں۔',
                  )}
                />
              </Field>
              <label className="checkbox spaced">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {t(
                  'I verified all changed times, special sessions and the effective date against this exact version.',
                  'میں نے اس ورژن کے تمام تبدیل شدہ اوقات، جماعتوں اور تاریخ کی تصدیق کی۔',
                )}
              </label>
              <Field
                label={t(
                  'Message to representative / decision reason',
                  'نمائندے کو پیغام / فیصلے کی وجہ',
                )}
              >
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </Field>
            </fieldset>
          </Panel>
        </div>
        <aside className="stack">
          <Panel title={t('Registered mosque authority', 'رجسٹرڈ مسجد کی اتھارٹی')}>
            <div className="icon-tile">
              <Phone />
            </div>
            <h3>{t('Registered Imam', 'رجسٹرڈ امام')}</h3>
            <p>{v.contactName}</p>
            <a href={v.contactNumber ? 'tel:' + v.contactNumber : undefined}>
              {v.contactNumber || 'Contact not recorded'}
            </a>
            <Badge tone="neutral">{t('Private contact', 'نجی رابطہ')}</Badge>
            <p>
              {t(
                'Private contact access is restricted to authorized management.',
                'اس نمونے میں حقیقی نمبر نہیں۔ حقیقی رابطہ صرف مقررہ نگران دیکھ سکتا ہے۔',
              )}
            </p>
          </Panel>
          <Panel title={t('Verification decision', 'تصدیقی فیصلہ')}>
            <div className="stack">
              <button disabled={!valid} onClick={() => setDecision('Approved')}>
                <ShieldCheck size={17} />
                {t('Approve verified timings', 'تصدیق شدہ اوقات منظور')}
              </button>
              <button
                className="secondary"
                disabled={!eligible || !message.trim()}
                onClick={() => setDecision('Returned')}
              >
                {t('Return for correction', 'اصلاح کے لیے واپس')}
              </button>
              <button
                className="secondary"
                disabled={
                  !eligible || !outcome || !person.trim() || !when || !notes.trim()
                }
                onClick={async () => {
                  try {
                    await mutate('/management/proposals/' + p.id + '/call-attempts', {
                      outcome,
                      person,
                      calledAt: when + ':00+05:00',
                      notes,
                    });
                    toast(
                      t(
                        'Call attempt saved. Submission remains pending.',
                        'کال کی کوشش محفوظ۔ درخواست زیر التوا ہے۔',
                      ),
                    );
                  } catch {
                    return;
                  }
                }}
              >
                {t('Record attempt · keep pending', 'کوشش درج کریں · زیر التوا رکھیں')}
              </button>
              <button
                className="secondary danger-text"
                disabled={!eligible || !message.trim()}
                onClick={() => setDecision('Rejected')}
              >
                {t('Reject submission', 'درخواست رد کریں')}
              </button>
            </div>
            <p className="small muted">
              {t(
                'Return and reject require an actionable reason. Unreachable is never verification.',
                'واپسی اور رد کرنے کے لیے واضح وجہ ضروری ہے۔ جواب نہ آنا تصدیق نہیں۔',
              )}
            </p>
          </Panel>
        </aside>
      </div>
      {decision && (
        <Modal
          title={t('Confirm decision', 'فیصلے کی تصدیق')}
          onClose={() => setDecision('')}
        >
          <p>
            {tr(decision)} · {p.id} · v{p.version}
          </p>
          <p>
            {t(
              'This records your decision for this exact version and queues a notification for the representative.',
              'یہ اسی ورژن کا فیصلہ درج کرے گا اور نمائندے کو اطلاع بھیجے گا۔',
            )}
          </p>
          <div className="form-actions">
            <button className="secondary" onClick={() => setDecision('')}>
              {t('Cancel', 'منسوخ')}
            </button>
            <button onClick={commit}>{t('Confirm decision', 'فیصلہ درج کریں')}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
