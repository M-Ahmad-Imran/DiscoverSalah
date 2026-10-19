import { Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { uid } from '../../utils/id';

export function NoticeForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { db, update, actor, t } = useApp();
  const venues = useScopedVenues();
  const n = db.notices.find((n) => n.id === id);
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const allowLeave = useUnsavedChanges(dirty);
  if (n && !venues.some((v) => v.id === n.venueId)) return <AccessDenied />;
  return (
    <>
      <PageTitle
        title={t(
          n ? 'Revise mosque notice' : 'Create mosque notice',
          n ? 'مسجد کے اعلان میں ترمیم' : 'مسجد کا اعلان بنائیں',
        )}
      />
      <Panel>
        <form
          className="stack"
          onInput={() => setDirty(true)}
          onSubmit={(e) => {
            e.preventDefault();
            const savingDraft =
              (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'draft';
            const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<
              string,
              string
            >;
            if (!savingDraft && new Date(x.expires) <= new Date(x.event)) {
              e.currentTarget
                .querySelector<HTMLInputElement>('[name=expires]')
                ?.setCustomValidity('Expiry must be after the event.');
              e.currentTarget.reportValidity();
              return;
            }
            update((d) => ({
              ...d,
              notices: [
                {
                  id: uid('notice'),
                  replacesId: n?.state === 'Published' ? n.id : n?.replacesId,
                  venueId: x.venue,
                  title: x.title || 'Untitled draft',
                  body: x.body,
                  category: x.category,
                  event: x.event,
                  expires: x.expires,
                  state: savingDraft ? 'Draft' : 'Submitted',
                  source: x.source,
                  author: actor,
                },
                ...d.notices.map((old) =>
                  old.id === id && old.state !== 'Published'
                    ? { ...old, state: 'Superseded' }
                    : old,
                ),
              ],
            }));
            allowLeave();
            navigate('/manage/notices');
          }}
        >
          <div className="two-grid">
            <Field label={t('Mosque', 'مسجد')}>
              <select
                name="venue"
                defaultValue={n?.venueId || params.get('venue') || venues[0]?.id}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('Category', 'قسم')}>
              <select name="category" defaultValue={n?.category}>
                {['Religious event', 'Mosque service', 'Death / Janazah'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t('Public title', 'عوامی عنوان')}>
            <input name="title" defaultValue={n?.title} required maxLength={120} />
          </Field>
          <Field label={t('Public details', 'عوامی تفصیلات')}>
            <textarea name="body" defaultValue={n?.body} required rows={4} />
          </Field>
          <div className="two-grid">
            <Field label={t('Event date & time', 'تقریب کی تاریخ اور وقت')}>
              <input
                name="event"
                type="datetime-local"
                required
                defaultValue={n?.event}
              />
            </Field>
            <Field label={t('Expiry date & time', 'اختتام کی تاریخ اور وقت')}>
              <input
                name="expires"
                type="datetime-local"
                required
                defaultValue={n?.expires}
                onInput={(e) => e.currentTarget.setCustomValidity('')}
              />
            </Field>
          </div>
          <Field
            label={t(
              'Private source authority / consent evidence',
              'نجی ماخذ / اجازت کے شواہد',
            )}
          >
            <textarea name="source" defaultValue={n?.source} required rows={3} />
          </Field>
          <Alert>
            {t(
              'Sensitive death/Janazah notices need an authorized family or mosque source. No private family details, fundraising or automatic arrival estimates.',
              'وفات یا جنازے کی اطلاع کے لیے اہل خاندان یا مسجد کی تصدیق ضروری ہے۔ نجی معلومات یا چندہ شامل نہ کریں۔',
            )}
          </Alert>
          <button
            type="submit"
            name="intent"
            value="draft"
            formNoValidate
            className="secondary"
          >
            {t('Save draft', 'مسودہ محفوظ کریں')}
          </button>
          <button type="submit" name="intent" value="submit">
            {t('Submit for moderation', 'جائزے کے لیے بھیجیں')}
            <Send size={17} />
          </button>
        </form>
      </Panel>
    </>
  );
}
