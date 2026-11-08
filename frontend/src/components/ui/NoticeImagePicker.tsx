import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../hooks/useApp';
import {
  api,
  ApiError,
  uploadNoticeImage,
  type UploadedNoticeImage,
} from '../../services/api';
import { requestId } from '../../utils/id';
import { Field } from './Field';
import { NoticeImage } from './NoticeImage';

export interface NoticeAttachment {
  id: string;
  previewUrl: string;
  attachBefore?: string;
}
export function NoticeImagePicker({
  venueId,
  value,
  onChange,
  onBlocked,
}: {
  venueId: string;
  value: NoticeAttachment | null;
  onChange: (image: NoticeAttachment | null) => void;
  onBlocked: (blocked: boolean) => void;
}) {
  const { t } = useApp();
  const [config, setConfig] = useState<{ enabled: boolean; maxBytes: number } | null>(
    null,
  );
  const [configError, setConfigError] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [pending, setPending] = useState<{ file: File; key: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    setConfigError('');
    void api<{ enabled: boolean; maxBytes: number }>('/management/notice-images/config')
      .then((result) => {
        if (active) setConfig(result);
      })
      .catch((e) => {
        if (active) setConfigError(e.message);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => () => request.current?.abort(), []);
  async function upload(selection: { file: File; key: string }) {
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setPercent(0);
    setError('');
    onBlocked(true);
    try {
      const result: UploadedNoticeImage = await uploadNoticeImage(
        selection.file,
        venueId,
        selection.key,
        controller.signal,
        setPercent,
      );
      if (controller.signal.aborted) return;
      onChange({
        id: result.id,
        previewUrl: result.previewUrl,
        attachBefore: result.attachBefore,
      });
      setPending(null);
      onBlocked(false);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError((e as Error).message);
      if (e instanceof ApiError && e.code === 'IMAGE_EXPIRED')
        setPending({ ...selection, key: requestId() });
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function remove() {
    request.current?.abort();
    setBusy(false);
    setPending(null);
    setError('');
    onChange(null);
    onBlocked(false);
    if (input.current) input.current.value = '';
  }
  return (
    <section
      className="stack notice-image-picker"
      aria-label={t('Notice image', 'اعلان کی تصویر')}
    >
      <Field
        label={t('Poster / image (optional)', 'پوسٹر / تصویر (اختیاری)')}
        hint={t(
          'One JPG, PNG or WebP, up to 5 MiB. Keep the main information in the text fields too.',
          'ایک JPG، PNG یا WebP تصویر، زیادہ سے زیادہ 5 MiB۔ اہم معلومات تحریر میں بھی درج کریں۔',
        )}
      >
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={!config?.enabled || busy || !venueId}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (
              !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
              !file.size ||
              file.size > (config?.maxBytes || 5 * 1024 * 1024)
            ) {
              setError(
                t(
                  'Choose a JPG, PNG or WebP image up to 5 MiB.',
                  '5 MiB تک JPG، PNG یا WebP تصویر منتخب کریں۔',
                ),
              );
              e.target.value = '';
              return;
            }
            const selection = { file, key: requestId() };
            setPending(selection);
            onChange(null);
            void upload(selection);
          }}
        />
      </Field>
      {!config && !configError && (
        <p role="status">
          {t('Checking image uploads…', 'تصویر اپ لوڈ کی سہولت چیک ہو رہی ہے…')}
        </p>
      )}
      {config && !config.enabled && (
        <p>
          {t(
            'Image uploads are unavailable. You can still submit a text notice.',
            'تصویر اپ لوڈ دستیاب نہیں۔ آپ تحریری اعلان بھیج سکتے ہیں۔',
          )}
        </p>
      )}
      {configError && (
        <div role="alert">
          {configError}{' '}
          <button
            type="button"
            className="secondary"
            onClick={() => setReload(reload + 1)}
          >
            {t('Retry', 'دوبارہ کوشش کریں')}
          </button>
        </div>
      )}
      {busy && (
        <div role="status">
          <progress
            max={100}
            value={percent}
            aria-label={t('Image upload progress', 'تصویر اپ لوڈ کی پیش رفت')}
          />
          <p>
            {percent < 100
              ? t(`Uploading image… ${percent}%`, `تصویر اپ لوڈ ہو رہی ہے… ${percent}%`)
              : t('Processing image. Please wait…', 'تصویر تیار ہو رہی ہے۔ انتظار کریں…')}
          </p>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {pending && !busy && (
        <button type="button" className="secondary" onClick={() => void upload(pending)}>
          {t('Retry image upload', 'تصویر دوبارہ اپ لوڈ کریں')}
        </button>
      )}
      {value && (
        <>
          <NoticeImage
            key={value.previewUrl}
            src={value.previewUrl}
            title={t('Preview', 'پیش منظر')}
          />
          <p>
            {t(
              'Check that the text is readable. The image becomes public only after approval.',
              'چیک کریں کہ تحریر صاف پڑھی جا رہی ہے۔ تصویر منظوری کے بعد ہی عوام کو نظر آئے گی۔',
            )}
          </p>
        </>
      )}
      {(value || pending || busy) && (
        <button type="button" className="secondary" onClick={remove}>
          {t(
            'Remove image / continue with text only',
            'تصویر ہٹائیں / صرف تحریری اعلان رکھیں',
          )}
        </button>
      )}
    </section>
  );
}
