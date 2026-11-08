import { Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { RecordSelect } from '../../components/ui/RecordSelect';
import {
  NoticeImagePicker,
  type NoticeAttachment,
} from '../../components/ui/NoticeImagePicker';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { tr } from '../../i18n/translate';

const pakistanInputTime = (value?: string) =>
  value
    ? new Date(Date.parse(value) + 5 * 3600000).toISOString().slice(0, 16)
    : undefined;

export function NoticeForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { db, mutate, actor, t } = useApp();
  const venues = useScopedVenues();
  const n = db.notices.find((n) => n.id === id);
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const [venueId, setVenueId] = useState(
    n?.venueId || params.get('venue') || venues[0]?.id || '',
  );
  const [attachment, setAttachment] = useState<NoticeAttachment | null>(
    n?.imageId && n.imageUrl && n.author === actor && Date.parse(n.expires) > Date.now()
      ? { id: n.imageId, previewUrl: n.imageUrl, attachBefore: n.expires }
      : null,
  );
  const [imageBlocked, setImageBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
          onSubmit={async (e) => {
            try {
              e.preventDefault();
              if (saving || imageBlocked) return;
              setError('');
              if (
                attachment?.attachBefore &&
                Date.parse(attachment.attachBefore) <= Date.now()
              ) {
                setError(
                  t(
                    'This image has expired. Remove it or upload it again.',
                    'اس تصویر کی مدت ختم ہو گئی ہے۔ اسے ہٹائیں یا دوبارہ اپ لوڈ کریں۔',
                  ),
                );
                return;
              }
              const savingDraft =
                (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') ===
                'draft';
              const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<
                string,
                string
              >;
              if (!savingDraft && new Date(x.expires) <= new Date(x.event)) {
                e.currentTarget
                  .querySelector<HTMLInputElement>('[name=expires]')
                  ?.setCustomValidity(
                    t(
                      'Expiry must be after the event.',
                      'اختتام کا وقت تقریب کے بعد ہونا چاہیے۔',
                    ),
                  );
                e.currentTarget.reportValidity();
                return;
              }
              setSaving(true);
              await mutate('/management/notices', {
                venueId,
                title: x.title,
                body: x.body,
                category: x.category,
                event: x.event + ':00+05:00',
                expires: x.expires + ':00+05:00',
                source: x.source,
                draft: savingDraft,
                ...(n ? { replacesId: n.id } : {}),
                ...(attachment ? { imageId: attachment.id } : {}),
              });
              allowLeave();
              navigate('/manage/notices');
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="two-grid">
            <Field label={t('Mosque', 'مسجد')}>
              <RecordSelect
                resource="venues"
                name="venue"
                required
                value={venueId}
                disabled={saving || !!n}
                onChange={(e) => {
                  setVenueId(e.target.value);
                  setAttachment(null);
                  setImageBlocked(false);
                  setDirty(true);
                }}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </RecordSelect>
            </Field>
            <Field label={t('Category', 'قسم')}>
              <select name="category" defaultValue={n?.category}>
                {['Religious event', 'Mosque service', 'Death / Janazah'].map((x) => (
                  <option key={x} value={x}>
                    {tr(x)}
                  </option>
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
          <fieldset disabled={saving} className="notice-image-fieldset">
            {n?.imageId && n.author !== actor && (
              <p>
                {t(
                  'To include a poster in your revision, upload your own copy. Another author’s image cannot be reused.',
                  'اپنی ترمیم میں تصویر شامل کرنے کے لیے نئی کاپی اپ لوڈ کریں۔ دوسرے لکھنے والے کی تصویر دوبارہ استعمال نہیں ہو سکتی۔',
                )}
              </p>
            )}
            <NoticeImagePicker
              key={venueId}
              venueId={venueId}
              value={attachment}
              onChange={(value) => {
                setAttachment(value);
                setDirty(true);
              }}
              onBlocked={setImageBlocked}
            />
          </fieldset>
          <div className="two-grid">
            <Field label={t('Event date & time', 'تقریب کی تاریخ اور وقت')}>
              <input
                name="event"
                type="datetime-local"
                required
                defaultValue={pakistanInputTime(n?.event)}
              />
            </Field>
            <Field label={t('Expiry date & time', 'اختتام کی تاریخ اور وقت')}>
              <input
                name="expires"
                type="datetime-local"
                required
                defaultValue={pakistanInputTime(n?.expires)}
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
            disabled={saving || imageBlocked}
            type="submit"
            name="intent"
            value="draft"
            formNoValidate
            className="secondary"
          >
            {t('Save draft', 'مسودہ محفوظ کریں')}
          </button>
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={saving || imageBlocked}
          >
            {t('Submit for moderation', 'جائزے کے لیے بھیجیں')}
            <Send size={17} />
          </button>
        </form>
      </Panel>
    </>
  );
}
