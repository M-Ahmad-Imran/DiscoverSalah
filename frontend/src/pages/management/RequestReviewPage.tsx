import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { DisputePanel } from '../../components/management/DisputePanel';
import { Timetable } from '../../components/management/Timetable';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { canAccessRequest } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';

export function RequestReview() {
  const { id } = useParams();
  const { db, mutate, role, actor, t, toast } = useApp();
  const r = db.requests.find((x) => x.id === id);
  const [status, setStatus] = useState(r?.status || 'In review');
  const [reason, setReason] = useState(r?.internalNotes || '');
  const [publicResponse, setPublicResponse] = useState(r?.response || '');
  const [checked, setChecked] = useState(false);
  const [independent, setIndependent] = useState(false);
  const [duplicate, setDuplicate] = useState('');
  const [authority, setAuthority] = useState('');
  const [calledAt, setCalledAt] = useState('');
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
          : ['Approved', 'Returned', 'Rejected'];
  const approve = status === 'Approved';
  const selfReview = r.values.author === actor;
  const listing = db.venues.find((v) => v.id === r.values.venue);
  const missingOwnership =
    r.kind === 'registration' && (!listing?.rep || !listing?.focal);
  async function saveDecision() {
    if (!r) return;
    const confirmation = {
      outcome: 'Confirmed as submitted',
      person: authority,
      calledAt: calledAt ? calledAt + ':00+05:00' : '',
      notes: reason,
    };
    if (r.kind === 'registration') {
      await mutate('/management/registrations/' + r.values.venue + '/decision', {
        revision: listing?.revision,
        decision: status,
        reason,
        ...(approve
          ? {
              checks: {
                identity: true,
                entrance: true,
                relationship: true,
                contactAuthority: true,
              },
              evidence: confirmation,
            }
          : {}),
      });
    } else if (['profile-change', 'contact-change'].includes(r.kind)) {
      await mutate('/management/changes/' + r.id + '/decision', {
        revision: r.revision || 0,
        venueRevision: listing?.revision,
        decision: status,
        reason,
        ...(approve ? { independentAuthority: authority, evidence: confirmation } : {}),
      });
    } else if (rep) {
      await mutate('/management/requests/' + r.id + '/follow-up', { notes: reason });
    } else
      await mutate('/management/requests/' + r.id + '/decision', {
        expectedStatus: r.status,
        status,
        publicResponse: publicResponse || 'Your request has been reviewed.',
        privateNotes: reason,
        ...(duplicate ? { linkedVenueId: duplicate } : {}),
        ...(r.kind === 'application' && approve
          ? {
              checks: {
                contact: true,
                reference: true,
                availability: true,
                suitability: true,
              },
            }
          : {}),
      });
  }
  return (
    <>
      <PageTitle
        eyebrow={r.id}
        title={r.title}
        action={<Badge tone="amber">{r.status}</Badge>}
      />
      {r.kind === 'registration' &&
        r.status === 'Returned' &&
        listing &&
        (listing.rep === actor || r.values.author === actor) && (
          <Alert tone="warning">
            <p>{r.internalNotes}</p>
            <Link className="button" to={`/manage/registrations/${listing.id}/edit`}>
              {t('Correct and resubmit registration', 'اندراج درست کر کے دوبارہ بھیجیں')}
            </Link>
          </Alert>
        )}
      <div className="detail-grid">
        {r.kind === 'report' && listing && (
          <DisputePanel venue={listing} reportId={r.id} />
        )}
        <Panel title={t('Submitted information', 'جمع شدہ معلومات')}>
          <dl className="definition-list">
            {Object.entries(r.values).map(([key, val]) => (
              <div key={key}>
                <dt>{tr(key)}</dt>
                <dd>{String(val)}</dd>
              </div>
            ))}
          </dl>
          {r.kind === 'registration' && listing && (
            <div className="stack">
              <p>
                {t('Entrance coordinates', 'داخلی دروازے کے مختصات')}: {listing.lat},{' '}
                {listing.lng}
              </p>
              <p>
                {t('Representative relationship', 'نمائندے کا تعلق')}:{' '}
                {listing.registrationRelationship || '—'}
              </p>
              <p>
                {t('Private Imam contact', 'امام کا نجی رابطہ')}: {listing.contactName} ·{' '}
                {listing.contactNumber}
              </p>
              <Timetable times={listing.times} />
              <p>
                {t('Effective date', 'نفاذ کی تاریخ')}: {listing.initialEffective}
              </p>
              <dl className="definition-list">
                {Object.entries(listing.facilities).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Panel>
        <Panel
          title={t(
            rep ? 'Add follow-up' : 'Review & resolution',
            rep ? 'مزید معلومات شامل کریں' : 'جائزہ اور حل',
          )}
        >
          {r.kind === 'registration' && r.status !== 'Submitted' ? (
            <Alert>
              {t(
                'This review is closed. Returned registrations must be corrected and resubmitted before another decision.',
                'یہ جائزہ بند ہے۔ نئے فیصلے سے پہلے واپس کیا گیا اندراج درست کر کے دوبارہ بھیجیں۔',
              )}
            </Alert>
          ) : (
            <form
              className="stack"
              onSubmit={async (e) => {
                try {
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
                  await saveDecision();
                  toast(t('Review saved.', 'جائزہ محفوظ ہو گیا۔'));
                } catch {
                  return;
                }
              }}
            >
              {approve &&
                ['registration', 'contact-change', 'profile-change'].includes(r.kind) && (
                  <>
                    <Field label={tr('Established authority contacted')}>
                      <input
                        value={authority}
                        onChange={(e) => setAuthority(e.target.value)}
                        minLength={5}
                        required
                      />
                    </Field>
                    <Field label={tr('Actual confirmation call (Pakistan time)')}>
                      <input
                        type="datetime-local"
                        value={calledAt}
                        onChange={(e) => setCalledAt(e.target.value)}
                        required
                      />
                    </Field>
                  </>
                )}
              {!rep && (
                <Field label={t('Disposition', 'فیصلہ')}>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {!options.includes(status) && (
                      <option value={status} disabled>
                        {tr('Select a decision')}{' '}
                      </option>
                    )}
                    {options.map((x) => (
                      <option key={x} value={x}>
                        {tr(x)}
                      </option>
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
                        'Approval records the application decision. An authorized issuer must create account credentials separately.',
                        'منظوری سے درخواست کا فیصلہ درج ہوتا ہے۔ مجاز شخص کو اکاؤنٹ کی اسناد الگ بنانا ہوں گی۔',
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
          )}
        </Panel>
      </div>
    </>
  );
}
