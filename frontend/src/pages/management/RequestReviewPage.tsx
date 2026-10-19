import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { DisputePanel } from '../../components/management/DisputePanel';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { canAccessRequest } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';
import { today } from '../../utils/date';
import { uid } from '../../utils/id';

export function RequestReview() {
  const { id } = useParams();
  const { db, update, role, actor, t, toast } = useApp();
  const r = db.requests.find((x) => x.id === id);
  const [status, setStatus] = useState(r?.status || 'In review');
  const [reason, setReason] = useState(r?.internalNotes || '');
  const [publicResponse, setPublicResponse] = useState(r?.response || '');
  const [checked, setChecked] = useState(false);
  const [independent, setIndependent] = useState(false);
  const [duplicate, setDuplicate] = useState('');
  const [assessment, setAssessment] = useState<string[]>(r?.assessment?.checks || []);
  const requiredChecks =
    r?.kind === 'application'
      ? [
          'Contact verified',
          'Independent reference checked',
          'Availability discussed',
          'Suitability assessed',
          'Proposed scope confirmed',
        ]
      : [];
  const assessmentComplete = requiredChecks.every((check) => assessment.includes(check));
  if (!r || !canAccessRequest(db, role, actor, r)) return <AccessDenied />;
  const rep = role === 'representative';
  const options =
    r.kind === 'report'
      ? ['Open', 'In review', 'Escalated', 'Resolved', 'Dismissed']
      : r.kind === 'suggestion'
        ? ['Submitted', 'In review', 'Onboarding', 'Linked', 'Closed']
        : r.kind === 'application'
          ? [
              'Submitted',
              'In review',
              'Awaiting checks',
              'Waitlisted',
              'Approved',
              'Rejected',
              'Withdrawn',
            ]
          : ['Submitted', 'In review', 'Approved', 'Returned', 'Rejected'];
  const approve = status === 'Approved';
  const selfReview = r.values.author === actor;
  const listing = db.venues.find((v) => v.id === r.values.venue);
  const missingOwnership =
    r.kind === 'registration' && (!listing?.rep || !listing?.focal);
  return (
    <>
      <PageTitle
        eyebrow={r.id}
        title={r.title}
        action={<Badge tone="amber">{r.status}</Badge>}
      />
      <div className="detail-grid">
        {r.kind === 'report' && listing && (
          <DisputePanel venue={listing} reportId={r.id} />
        )}
        <Panel title={t('Submitted information', 'جمع شدہ معلومات')}>
          <dl className="definition-list">
            {Object.entries(r.values).map(([key, val]) => (
              <div key={key}>
                <dt>{key.replaceAll(':', ' · ')}</dt>
                <dd>{String(val)}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel
          title={t(
            rep ? 'Add follow-up' : 'Review & resolution',
            rep ? 'مزید معلومات شامل کریں' : 'جائزہ اور حل',
          )}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                approve &&
                (rep ||
                  !checked ||
                  !assessmentComplete ||
                  !independent ||
                  selfReview ||
                  missingOwnership ||
                  r.status === 'Approved')
              )
                return;
              if (
                !window.confirm(
                  t(
                    'Record this decision for the current request?',
                    'موجودہ درخواست کا فیصلہ درج کریں؟',
                  ),
                )
              )
                return;
              update((d) => {
                let next = {
                  ...d,
                  requests: d.requests.map((x) =>
                    x.id === r.id
                      ? {
                          ...x,
                          status: rep ? x.status : status,
                          response: publicResponse,
                          internalNotes: reason,
                          assessment: {
                            checks: assessment,
                            reviewer: actor,
                            at: new Date().toISOString(),
                          },
                          values: {
                            ...x.values,
                            ...(duplicate ? { linkedVenue: duplicate } : {}),
                          },
                        }
                      : x,
                  ),
                  audit: [
                    {
                      id: uid('A'),
                      action: `${r.kind} ${rep ? 'follow-up' : status} · ${r.id}`,
                      actor,
                      at: new Date().toISOString(),
                      target: r.values.venue || r.id,
                    },
                    ...d.audit,
                  ],
                };
                if (approve && r.kind === 'registration')
                  next.venues = d.venues.map((v) =>
                    v.id === r.values.venue
                      ? {
                          ...v,
                          status: 'Published',
                          phoneVerified: today(),
                          reconfirmed: today(),
                        }
                      : v,
                  );
                if (approve && r.kind === 'profile-change')
                  next.venues = d.venues.map((v) =>
                    v.id === r.values.venue
                      ? {
                          ...v,
                          name: r.values.name || v.name,
                          address: r.values.address || v.address,
                          facilities: Object.fromEntries(
                            Object.entries(r.values)
                              .filter(([k]) => k.startsWith('facility:'))
                              .map(([k, val]) => [k.slice(9), val]),
                          ),
                        }
                      : v,
                  );
                if (approve && r.kind === 'application')
                  next.accounts = [
                    ...d.accounts,
                    {
                      id: uid('account'),
                      name: r.values.name,
                      contactNumber: r.values.contactNumber,
                      role: r.values.role === 'focal' ? 'focal' : 'representative',
                      area: r.values.area,
                      active: false,
                      status: 'Invited',
                    },
                  ];
                return next;
              });
              toast(
                t('Review saved in this preview.', 'جائزہ پیش نظارے میں محفوظ ہو گیا۔'),
              );
            }}
          >
            {!rep && (
              <Field label={t('Disposition', 'فیصلہ')}>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {options.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            )}
            {r.kind === 'suggestion' && status === 'Linked' && (
              <Field label={t('Existing listing', 'موجودہ اندراج')}>
                <select
                  required
                  value={duplicate}
                  onChange={(e) => setDuplicate(e.target.value)}
                >
                  <option value="">{t('Select a mosque', 'مسجد منتخب کریں')}</option>
                  {db.venues.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {r.kind === 'application' && (
              <fieldset>
                <legend>{t('Application assessment', 'درخواست کی جانچ')}</legend>
                {requiredChecks.map((check) => (
                  <label className="checkbox" key={check}>
                    <input
                      type="checkbox"
                      checked={assessment.includes(check)}
                      onChange={(e) =>
                        setAssessment(
                          e.target.checked
                            ? [...assessment, check]
                            : assessment.filter((x) => x !== check),
                        )
                      }
                    />
                    {check}
                  </label>
                ))}
              </fieldset>
            )}
            {approve && (
              <>
                {(selfReview || missingOwnership) && (
                  <Alert tone="warning">
                    {selfReview
                      ? t(
                          'An independent reviewer must decide this request.',
                          'اس درخواست کا فیصلہ آزاد نگران کرے۔',
                        )
                      : t(
                          'Assign a representative and focal person before publication.',
                          'اشاعت سے پہلے نمائندہ اور نگران مقرر کریں۔',
                        )}
                  </Alert>
                )}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    required
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  {t(
                    r.kind === 'registration'
                      ? 'I checked identity, entrance, relationship, initial timetable and registered Imam confirmation.'
                      : 'Contact ownership and all required facts have been checked.',
                    r.kind === 'registration'
                      ? 'شناخت، داخلی دروازہ، تعلق، اوقات اور امام کی تصدیق چیک کی۔'
                      : 'رابطے کی ملکیت اور تمام مطلوبہ معلومات چیک کیں۔',
                  )}
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    required
                    checked={independent}
                    onChange={(e) => setIndependent(e.target.checked)}
                  />
                  {t(
                    'I am independent of the submitter and have verified the trusted reference.',
                    'میں درخواست دینے والے سے الگ ہوں اور معتبر حوالہ چیک کیا ہے۔',
                  )}
                </label>
                {r.kind === 'application' && (
                  <Alert>
                    {t(
                      'Approval creates an inactive invitation record. It does not activate access.',
                      'منظوری غیر فعال دعوت بنائے گی۔ رسائی فعال نہیں ہوگی۔',
                    )}
                  </Alert>
                )}
              </>
            )}
            <Field
              label={t(
                'Private investigation notes / decision reason',
                'نجی تحقیق / فیصلے کی وجہ',
              )}
            >
              <textarea
                required
                minLength={5}
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Field
              label={t(
                'Public response for the request owner',
                'درخواست دینے والے کے لیے جواب',
              )}
            >
              <textarea
                value={publicResponse}
                onChange={(e) => setPublicResponse(e.target.value)}
                rows={3}
              />
            </Field>
            <button
              type="submit"
              disabled={
                approve &&
                (!checked ||
                  !assessmentComplete ||
                  !independent ||
                  selfReview ||
                  missingOwnership ||
                  rep ||
                  r.status === 'Approved')
              }
            >
              {t('Save review', 'جائزہ محفوظ کریں')}
            </button>
            <Alert>
              {t(
                'Reports do not automatically change official timings. Schedule corrections use the independent timetable workflow.',
                'رپورٹ خود اوقات تبدیل نہیں کرتی۔ اصلاح کے لیے اوقات کا آزاد تصدیقی عمل استعمال کریں۔',
              )}
            </Alert>
          </form>
        </Panel>
      </div>
    </>
  );
}
