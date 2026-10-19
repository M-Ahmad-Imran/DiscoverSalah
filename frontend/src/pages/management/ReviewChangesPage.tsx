import { ArrowLeft, Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Timetable } from '../../components/management/Timetable';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { Steps } from '../../components/ui/Steps';
import { canManage } from '../../domain/permissions';
import { resolveSpecial, resolveTimes } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { Proposal } from '../../types/index';
import { timeLabel, today } from '../../utils/date';
import { uid } from '../../utils/id';

export function ReviewChanges() {
  const { id } = useParams();
  const { db, actor, role, draft, setDraft, update, t } = useApp();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const v = db.venues.find((v) => v.id === id);
  if (!v || !role || !canManage(role, v, actor)) return <AccessDenied />;
  if (!draft || draft.venueId !== id)
    return (
      <Empty
        title={t('No draft to review', 'جائزے کے لیے مسودہ نہیں')}
        action={
          <ButtonLink to={'/manage/mosques/' + id + '/edit'}>
            {t('Open editor', 'ایڈیٹر کھولیں')}
          </ButtonLink>
        }
      />
    );
  const submit = () => {
    if (!checked) return;
    if (v.revision !== draft.baseRevision) {
      setError(
        t(
          'Version conflict. The mosque changed since editing began. Reload before submitting.',
          'ورژن کا تضاد۔ مسجد کی معلومات بدل گئی ہیں۔ پہلے دوبارہ لوڈ کریں۔',
        ),
      );
      return;
    }
    const pid = uid();
    const p: Proposal = {
      id: pid,
      venueId: id!,
      version:
        Math.max(
          v.revision,
          ...db.proposals.filter((x) => x.venueId === id).map((x) => x.version),
        ) + 1,
      baseRevision: v.revision + 1,
      author: actor,
      state: 'Submitted',
      times: { ...draft.times },
      before: resolveTimes(v, db.proposals, today()),
      special: structuredClone(draft.special),
      beforeSpecial: structuredClone(resolveSpecial(v, db.proposals, draft.effective)),
      effective: draft.effective,
      reason: draft.reason,
      created: new Date().toISOString(),
    };
    update((d) => ({
      ...d,
      venues: d.venues.map((x) => (x.id === id ? { ...x, revision: x.revision + 1 } : x)),
      proposals: [
        p,
        ...d.proposals.map((x) =>
          x.venueId === id && x.state === 'Submitted' ? { ...x, state: 'Superseded' } : x,
        ),
      ],
      notifications: [
        {
          id: uid('N'),
          title: `${v.name}: timetable submitted`,
          href: '/manage/review/' + pid,
          role: 'focal',
          read: false,
        },
        ...d.notifications,
      ],
      audit: [
        {
          id: uid('A'),
          action: 'Timetable submitted · ' + pid,
          actor,
          at: new Date().toISOString(),
          target: id!,
        },
        ...d.audit,
      ],
    }));
    setDraft(null);
    navigate('/manage/submissions/' + pid);
  };
  return (
    <>
      <PageTitle
        eyebrow={v.name}
        title={t('Review your timing changes', 'اوقات کی تبدیلیوں کا جائزہ')}
        description={t(
          'Check every value before submitting this version for independent verification.',
          'آزاد تصدیق کے لیے بھیجنے سے پہلے ہر وقت دیکھیں۔',
        )}
      />
      <Steps
        current={1}
        items={[
          t('Edit timetable', 'اوقات میں ترمیم'),
          t('Review changes', 'تبدیلیاں دیکھیں'),
          t('Submit for verification', 'تصدیق کے لیے جمع'),
        ]}
      />
      <div className="detail-grid">
        <div className="stack">
          <Panel title={t('Changed congregations', 'تبدیل شدہ جماعتیں')}>
            <Timetable
              times={draft.times}
              before={resolveTimes(v, db.proposals, today())}
            />
          </Panel>
          <Panel title={t('Special sessions', 'خصوصی جماعتیں')}>
            {draft.special.map((s) => (
              <div className="list-row" key={s.id}>
                <strong>
                  {s.prayer} · {s.date}
                </strong>
                <span>
                  {s.canceled ? 'Canceled' : timeLabel(s.time)}{' '}
                  {s.provisional ? '· Provisional' : ''}
                </span>
              </div>
            ))}
          </Panel>
          <Panel title={t('Reason & effective date', 'وجہ اور لاگو ہونے کی تاریخ')}>
            <p>{draft.reason}</p>
            <Badge tone="neutral">{draft.effective} · Asia/Karachi</Badge>
          </Panel>
        </div>
        <Panel title={t('What happens next?', 'اب کیا ہوگا؟')}>
          <ol className="process-list">
            <li>
              {t('A new immutable version is saved.', 'نیا مستقل ورژن محفوظ ہوگا۔')}
            </li>
            <li>
              {t(
                'Your Focal Person receives a review task.',
                'فوکل پرسن کو جائزے کا کام ملے گا۔',
              )}
            </li>
            <li>
              {t(
                'The registered Imam is called to verify this version.',
                'اس ورژن کی تصدیق امام سے فون پر ہوگی۔',
              )}
            </li>
            <li>
              {t(
                'Approved timings activate on the effective date.',
                'منظور شدہ اوقات مقررہ تاریخ پر لاگو ہوں گے۔',
              )}
            </li>
          </ol>
          <Alert>
            {t(
              'Submission is not publication. Only the affected prayer/date loses confident arrival estimates while under review.',
              'جمع کرانا اشاعت نہیں۔ صرف متاثرہ نماز اور تاریخ کے اندازے رکیں گے۔',
            )}
          </Alert>
        </Panel>
      </div>
      <Panel className="spaced">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          {t(
            'I checked the proposed times and dates. I understand that independent verification is required.',
            'میں نے مجوزہ اوقات اور تاریخیں دیکھی ہیں۔ آزاد تصدیق ضروری ہے۔',
          )}
        </label>
        {error && <Alert tone="warning">{error}</Alert>}
        <div className="form-actions">
          <ButtonLink secondary to={'/manage/mosques/' + id + '/edit'}>
            <ArrowLeft size={17} />
            {t('Back to edit', 'ترمیم پر واپس')}
          </ButtonLink>
          <button disabled={!checked} onClick={submit}>
            <Send size={17} />
            {t('Submit for verification', 'تصدیق کے لیے جمع کریں')}
          </button>
        </div>
      </Panel>
    </>
  );
}
