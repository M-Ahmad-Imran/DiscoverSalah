import { useState } from 'react';
import { useApp } from '../../hooks/useApp';

export function NoticeImage({
  src,
  title,
  compact = false,
  onReady,
}: {
  src: string;
  title: string;
  compact?: boolean;
  onReady?: (ready: boolean) => void;
}) {
  const { t } = useApp();
  const [failed, setFailed] = useState(false);
  // Only our scoped API can supply images; never render arbitrary remote URLs.
  if (
    failed ||
    !/^\/api\/v1\/(?:management\/)?(?:notices\/[^/]+\/image|notice-images\/[^/]+)$/.test(
      src,
    )
  )
    return (
      <p role="status">
        {t(
          'Image unavailable or expired. The notice text is still available.',
          'تصویر دستیاب نہیں یا اس کی مدت ختم ہو گئی ہے۔ اعلان کی تحریر موجود ہے۔',
        )}
      </p>
    );
  const image = (
    <img
      className={compact ? 'notice-image thumbnail' : 'notice-image'}
      src={src}
      alt={t('Notice poster: ', 'اعلان کی تصویر: ') + title}
      loading={compact ? 'lazy' : 'eager'}
      onLoad={() => onReady?.(true)}
      onError={() => {
        setFailed(true);
        onReady?.(false);
      }}
    />
  );
  return compact ? (
    image
  ) : (
    <figure className="notice-image-frame">
      {image}
      <figcaption>
        <a href={src} target="_blank" rel="noopener noreferrer">
          {t(
            'Open full image to read the details',
            'تفصیل پڑھنے کے لیے پوری تصویر کھولیں',
          )}
        </a>
      </figcaption>
    </figure>
  );
}
