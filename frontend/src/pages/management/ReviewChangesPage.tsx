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
import { Field } from '../../components/ui/Field';
import { canManage } from '../../domain/permissions';
import { resolveTimes } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';
import { timeLabel } from '../../utils/date';

export function ReviewChanges() {
  const { id } = useParams();
  const { db, actor, role, draft, setDraft, mutate, t } = useApp();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [contactMethod, setContactMethod] = useState('Phone');
  const [contactSource, setContactSource] = useState('');
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
  const submit = async () => {
    try {
      if (!checked || busy) return;
      if (role !== 'representative' && contactSource.trim().length < 5) {
        setError(
          t(
            'Record who confirmed the correction by phone or visit.',
            'فون یا ملاقات پر کس نے درستی کی تصدیق کی، درج کریں۔',
          ),
        );
        return;
      }
      if (v.revision !== draft.baseRevision) {
        setError(
          t(
            'Version conflict. The mosque changed since editing began. Reload before submitting.',
            'ورژن کا تضاد۔ مسجد کی معلومات بدل گئی ہیں۔ پہلے دوبارہ لوڈ کریں۔',
          ),
        );
        return;
      }
      setBusy(true);
      const saved = await mutate('/management/venues/' + id + '/proposals', {
        baseRevision: draft.baseRevision,
        times: draft.times,
        special: draft.special,
        effective: draft.effective,
        reason: draft.reason,
        ...(role !== 'representative' ? { contactMethod, contactSource } : {}),
      });
      setDraft(null);
      navigate('/manage/submissions/' + saved.id);
    } catch {
      return;
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow={v.name}
        title={t('Review your timing changes', 'اوقات کی تبدیلیوں کا جائزہ')}
        description={t(
          'Check every time and the effective date before publishing.',
          'شائع کرنے سے پہلے ہر وقت اور لاگو ہونے کی تاریخ چیک کریں۔',
        )}
      />
      <Steps
        current={1}
        items={[
          t('Edit timetable', 'اوقات میں ترمیم'),
          t('Review changes', 'تبدیلیاں دیکھیں'),
          t('Publish timetable', 'اوقات شائع کریں'),
        ]}
      />
      <div className="detail-grid">
        <div className="stack">
          <Panel title={t('Changed congregations', 'تبدیل شدہ جماعتیں')}>
            <Timetable
              times={draft.times}
              before={resolveTimes(v, db.proposals, draft.effective)}
            />
          </Panel>
          <Panel title={t('Special sessions', 'خصوصی جماعتیں')}>
            {draft.special.map((s) => (
              <div className="list-row" key={s.id}>
                <strong>
                  {tr(s.prayer)} · {s.date}
                </strong>
                <span>
                  {s.canceled ? tr('Canceled') : timeLabel(s.time)}{' '}
                  {s.provisional ? tr('· Provisional') : ''}
                </span>
              </div>
            ))}
          </Panel>
          <Panel title={t('Reason & effective date', 'وجہ اور لاگو ہونے کی تاریخ')}>
            <p>{draft.reason}</p>
            <Badge tone="neutral">
              {draft.effective}
              {tr('· Asia/Karachi')}
            </Badge>
          </Panel>
        </div>
        <Panel title={t('What happens next?', 'اب کیا ہوگا؟')}>
          <ol className="process-list">
            <li>
              {t('A new immutable version is saved.', 'نیا مستقل ورژن محفوظ ہوگا۔')}
            </li>
            <li>
              {t(
                'No focal approval is needed for timetable changes.',
                'اوقات بدلنے کے لیے فوکل کی منظوری ضروری نہیں۔',
              )}
            </li>
            <li>
              {t(
                'Check the timetable again in 7 days, even if nothing changes.',
                'تبدیلی نہ بھی ہو، ۷ دن بعد اوقات دوبارہ چیک کریں۔',
              )}
            </li>
            <li>
              {t(
                'Published timings start on the effective date.',
                'شائع شدہ اوقات مقررہ تاریخ پر لاگو ہوں گے۔',
              )}
            </li>
          </ol>
          <Alert>
            {t(
              'Publishing makes this version available immediately for its effective date. Correct a mistake by publishing a new version.',
              'شائع کرنے سے یہ ورژن مقررہ تاریخ کے لیے دستیاب ہوگا۔ غلطی درست کرنے کے لیے نیا ورژن شائع کریں۔',
            )}
          </Alert>
        </Panel>
      </div>
      <Panel className="spaced">
        {role !== 'representative' && (
          <div className="stack">
            <p>
              {t(
                'Focal correction: contact the imam or representative before publishing.',
                'فوکل کی درستی: شائع کرنے سے پہلے امام یا نمائندے سے رابطہ کریں۔',
              )}
            </p>
            <Field label={t('Confirmation method', 'تصدیق کا طریقہ')}>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
              >
                <option value="Phone">{t('Phone', 'فون')}</option>
                <option value="Visit">{t('Visit', 'ملاقات')}</option>
              </select>
            </Field>
            <Field
              label={t(
                'Who confirmed this correction? (private)',
                'درستی کی تصدیق کس نے کی؟ (نجی)',
              )}
            >
              <textarea
                value={contactSource}
                maxLength={2000}
                onChange={(e) => setContactSource(e.target.value)}
              />
            </Field>
          </div>
        )}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          {t(
            'I checked these times with the mosque and understand they will publish without focal approval.',
            'میں نے مسجد کے اوقات اور تاریخیں چیک کر لی ہیں۔ یہ فوکل کی منظوری کے بغیر شائع ہوں گے۔',
          )}
        </label>
        {error && <Alert tone="warning">{error}</Alert>}
        <div className="form-actions">
          <ButtonLink secondary to={'/manage/mosques/' + id + '/edit'}>
            <ArrowLeft size={17} />
            {t('Back to edit', 'ترمیم پر واپس')}
          </ButtonLink>
          <button disabled={!checked || busy} onClick={submit}>
            <Send size={17} />
            {t('Publish timetable', 'اوقات شائع کریں')}
          </button>
        </div>
      </Panel>
    </>
  );
}
