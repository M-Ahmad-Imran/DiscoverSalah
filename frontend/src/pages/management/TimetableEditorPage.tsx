import { ArrowRight, CalendarDays, ChevronRight, Clock, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { InfoIcon } from '../../components/common/InfoIcon';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { Steps } from '../../components/ui/Steps';
import { daily } from '../../domain/constants';
import { canManage } from '../../domain/permissions';
import { resolveSpecial, resolveTimes, validateTimes } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { urPrayers } from '../../i18n/prayerLabels';
import { tr } from '../../i18n/translate';
import { SpecialSession } from '../../types/index';
import { timeLabel, today } from '../../utils/date';
import { uid } from '../../utils/id';

export function TimetableEditor() {
  const { id } = useParams();
  const { db, role, actor, draft, setDraft, t, toast } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const v = db.venues.find((x) => x.id === id);
  const [tab, setTab] = useState(params.get('tab') || 'daily');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  useUnsavedChanges(dirty, '/manage/mosques/' + id + '/review-changes');
  useEffect(() => {
    if (v && draft?.venueId !== id)
      setDraft({
        venueId: v.id,
        times: { ...resolveTimes(v, db.proposals, today()) },
        special: resolveSpecial(v, db.proposals, today()).map((session) => ({
          ...session,
        })),
        effective: today(),
        reason: '',
        baseRevision: v.revision,
      });
  }, [id]);

  if (!v || !role || !canManage(role, v, actor)) return <AccessDenied />;
  if (!draft || draft.venueId !== id)
    return <p>{t('Preparing your draft…', 'مسودہ تیار ہو رہا ہے…')}</p>;
  const change = (part: Partial<typeof draft>) => {
    setDraft({ ...draft, ...part });
    setDirty(true);
  };
  const specialChange = (sid: string, part: Partial<SpecialSession>) =>
    change({
      special: draft.special.map((s) => (s.id === sid ? { ...s, ...part } : s)),
    });
  return (
    <>
      <div className="breadcrumb">
        <Link to={'/manage/mosques/' + id}>{v.name}</Link>
        <ChevronRight size={14} />
        {t('Edit timetable', 'اوقات میں ترمیم')}
      </div>
      <PageTitle
        title={t('Update Jama’at timings', 'جماعت کے اوقات بدلیں')}
        description={t(
          'Enter the actual congregation times. Changes are reviewed before publication.',
          'حقیقی جماعت کے اوقات درج کریں۔ اشاعت سے پہلے تبدیلیوں کا جائزہ ہوگا۔',
        )}
      />
      <Steps
        current={0}
        items={[
          t('Edit timetable', 'اوقات میں ترمیم'),
          t('Review changes', 'تبدیلیاں دیکھیں'),
          t('Submit for verification', 'تصدیق کے لیے جمع'),
        ]}
      />
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!validateTimes(draft.times)) {
            setError(
              t(
                'Enter valid times for all five daily prayers.',
                'پانچوں نمازوں کے درست اوقات درج کریں۔',
              ),
            );
            return;
          }
          if (draft.baseRevision !== v.revision) {
            setError(
              t(
                'A newer revision exists. Reload the mosque and reconcile your changes.',
                'نیا ورژن موجود ہے۔ مسجد دوبارہ کھول کر تبدیلیوں کا جائزہ لیں۔',
              ),
            );
            return;
          }
          setDirty(false);
          navigate('/manage/mosques/' + id + '/review-changes');
        }}
      >
        <div className="tabs">
          <button
            type="button"
            className={tab === 'daily' ? 'active' : ''}
            onClick={() => setTab('daily')}
          >
            <CalendarDays size={17} />
            {t('Recurring daily', 'روزانہ اوقات')}
          </button>
          <button
            type="button"
            className={tab === 'special' ? 'active' : ''}
            onClick={() => setTab('special')}
          >
            <Clock size={17} />
            {t('Friday, Eid & dated exceptions', 'جمعہ، عید اور تاریخ وار استثنا')}
          </button>
        </div>
        {tab === 'daily' ? (
          <Panel title={t('Prayer schedule matrix', 'نماز کے اوقات')}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('Prayer', 'نماز')}</th>
                    <th>{t('Approved time', 'منظور شدہ وقت')}</th>
                    <th>{t('Proposed Jama’at', 'مجوزہ جماعت')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {daily.map((p) => (
                    <tr key={p}>
                      <td>
                        <strong>{t(p, urPrayers[p])}</strong>
                      </td>
                      <td dir="ltr">
                        {timeLabel(resolveTimes(v, db.proposals, today())[p])}
                      </td>
                      <td>
                        <input
                          aria-label={p + ' proposed time'}
                          type="time"
                          required
                          value={draft.times[p]}
                          onInput={(e) =>
                            change({
                              times: { ...draft.times, [p]: e.currentTarget.value },
                            })
                          }
                        />
                      </td>
                      <td>
                        {draft.times[p] !== resolveTimes(v, db.proposals, today())[p] && (
                          <Badge tone="amber">{t('Changed', 'تبدیل شدہ')}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <Panel
            title={t(
              'Date-specific sessions & cancellations',
              'تاریخ وار جماعتیں اور منسوخیاں',
            )}
            action={
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  change({
                    special: [
                      ...draft.special,
                      {
                        id: uid('S'),
                        prayer: 'Jumu’ah',
                        date: today(),
                        time: '13:30',
                        khutbah: '13:00',
                        provisional: false,
                        canceled: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={17} />
                {t('Add session', 'جماعت شامل کریں')}
              </button>
            }
          >
            {draft.special.map((s, i) => (
              <div className="session-editor" key={s.id}>
                <div className="section-title">
                  <h3>
                    {t('Session', 'جماعت')} {i + 1}
                  </h3>
                  {s.canceled && <Badge tone="red">{t('Canceled', 'منسوخ')}</Badge>}
                </div>
                <div className="three-grid">
                  <Field label={t('Prayer / event', 'نماز / تقریب')}>
                    <select
                      value={s.prayer}
                      onChange={(e) => specialChange(s.id, { prayer: e.target.value })}
                    >
                      {[...daily, 'Jumu’ah', 'Eid'].map((p) => (
                        <option key={p} value={p}>
                          {tr(p)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('Local date', 'مقامی تاریخ')}>
                    <input
                      type="date"
                      required
                      value={s.date}
                      onInput={(e) =>
                        specialChange(s.id, { date: e.currentTarget.value })
                      }
                    />
                  </Field>
                  <Field label={t('Jama’at time', 'جماعت کا وقت')}>
                    <input
                      type="time"
                      required
                      value={s.time}
                      onInput={(e) =>
                        specialChange(s.id, { time: e.currentTarget.value })
                      }
                    />
                  </Field>
                  <Field label={t('Khutbah (optional)', 'خطبہ (اختیاری)')}>
                    <input
                      type="time"
                      value={s.khutbah}
                      onInput={(e) =>
                        specialChange(s.id, { khutbah: e.currentTarget.value })
                      }
                    />
                  </Field>
                </div>
                <div className="row wrap spaced">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={s.provisional}
                      onChange={(e) =>
                        specialChange(s.id, { provisional: e.target.checked })
                      }
                    />
                    {t('Date is provisional', 'تاریخ عارضی ہے')}
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={s.canceled}
                      onChange={(e) =>
                        specialChange(s.id, { canceled: e.target.checked })
                      }
                    />
                    {t(
                      'Explicitly cancel this session',
                      'یہ جماعت واضح طور پر منسوخ کریں',
                    )}
                  </label>
                </div>
              </div>
            ))}
            <Alert>
              {t(
                'Cancellation is explicit: a canceled dated session must never reappear through a recurring timetable.',
                'منسوخی واضح ہے؛ منسوخ جماعت روزانہ اوقات سے دوبارہ ظاہر نہیں ہوگی۔',
              )}
            </Alert>
          </Panel>
        )}
        <Panel title={t('Effective period & reason', 'لاگو ہونے کی تاریخ اور وجہ')}>
          <div className="two-grid">
            <Field
              label={t('Effective from (Asia/Karachi)', 'لاگو ہونے کی تاریخ (پاکستان)')}
            >
              <input
                type="date"
                min={today()}
                required
                value={draft.effective}
                onInput={(e) => change({ effective: e.currentTarget.value })}
              />
            </Field>
            <div className="quiet-note">
              <InfoIcon />
              <p>
                {t(
                  'Future approved schedules activate on their effective date. Today’s affected sessions stay under review until a decision.',
                  'آئندہ اوقات مقررہ تاریخ پر لاگو ہوں گے۔ آج کی متاثرہ جماعتیں فیصلے تک زیر تصدیق رہیں گی۔',
                )}
              </p>
            </div>
          </div>
          <Field label={t('Reason for change', 'تبدیلی کی وجہ')}>
            <textarea
              required
              minLength={5}
              rows={3}
              value={draft.reason}
              onChange={(e) => change({ reason: e.target.value })}
            />
          </Field>
        </Panel>
        {error && <Alert tone="warning">{error}</Alert>}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              navigate('/manage/mosques/' + id);
            }}
          >
            {t('Cancel', 'منسوخ')}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDirty(false);
              toast(
                t(
                  'Draft retained in this tab. Nothing has been submitted.',
                  'مسودہ اس ٹیب میں محفوظ ہے۔ جمع نہیں ہوا۔',
                ),
              );
            }}
          >
            {t('Keep draft', 'مسودہ رکھیں')}
          </button>
          <button type="submit">
            {t('Review changes', 'تبدیلیاں دیکھیں')}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </>
  );
}
