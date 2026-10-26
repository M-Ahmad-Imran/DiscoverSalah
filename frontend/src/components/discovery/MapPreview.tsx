import { Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';

// Retains the existing call-site contract without pretending to draw real geography.
export function MapPreview({
  items,
  selected,
  onSelect,
  large = false,
}: {
  items: { id: string; name: string }[];
  selected?: string;
  onSelect?: (id: string) => void;
  large?: boolean;
}) {
  const { t } = useApp();
  const { suffix } = useQuery();
  return (
    <section
      className="panel stack"
      aria-label={t('Locations and external navigation', 'مقامات اور بیرونی راستہ')}
    >
      <strong className="row">
        <MapPin size={20} />
        {t('Directions with Google Maps', 'گوگل میپس سے راستہ دیکھیں')}
      </strong>
      <p>
        {t(
          'Choose a mosque to view its entrance and open Google Maps. No embedded map or travel-time estimate is loaded here.',
          'مسجد کا داخلی مقام دیکھنے اور گوگل میپس کھولنے کے لیے مسجد منتخب کریں۔ یہاں نقشہ یا سفر کے دورانیے کا اندازہ لوڈ نہیں ہوتا۔',
        )}
      </p>
      {Array.from(new Map(items.map((v) => [v.id, v])).values())
        .slice(0, large ? 10 : 5)
        .map((v) =>
          onSelect ? (
            <button
              key={v.id}
              className="secondary"
              aria-pressed={selected === v.id}
              onClick={() => onSelect(v.id)}
            >
              <Building2 size={18} />
              {v.name}
            </button>
          ) : (
            <Link
              key={v.id}
              className="text-link"
              to={'/mosque/' + v.id + '/directions' + suffix}
            >
              {v.name}
            </Link>
          ),
        )}
      {!items.length && (
        <p className="muted">
          {t(
            'Use the location fields on this page. An entrance link becomes available after the mosque is published.',
            'اس صفحے کے مقام والے خانے استعمال کریں۔ مسجد شائع ہونے کے بعد داخلی مقام کا لنک دستیاب ہوگا۔',
          )}
        </p>
      )}
    </section>
  );
}
