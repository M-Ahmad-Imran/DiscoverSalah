import { Building2, MapPin } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

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
  return (
    <div className={`map-preview ${large ? 'large' : ''}`}>
      <svg viewBox="0 0 700 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="700" height="460" fill="#e5ece2" />
        <path d="M0 0h220v180H0zM440 280h260v180H440z" fill="#ccdfc4" />
        <g stroke="#fff" strokeWidth="16" fill="none">
          <path d="M-50 100L750 340M80-40L340 500M420-40L200 500M-20 300L720 150M550-30L560 500" />
        </g>
        <g stroke="#d4cda9" strokeWidth="22" fill="none">
          <path d="M-50 400Q350 370 720 30" />
        </g>
        <g fill="#788c7c" fontSize="16" fontFamily="sans-serif">
          <text x="40" y="64">
            GULBERG III
          </text>
          <text x="425" y="405">
            CANAL PARK
          </text>
          <text x="460" y="100">
            MAIN BOULEVARD
          </text>
        </g>
      </svg>
      {items.slice(0, 5).map((v, i) => (
        <button
          key={v.id}
          className={`map-pin ${selected === v.id ? 'selected' : ''}`}
          style={{
            left: `${[42, 67, 25, 78, 52][i]}%`,
            top: `${[42, 30, 67, 69, 55][i]}%`,
          }}
          onClick={() => onSelect?.(v.id)}
          aria-label={v.name}
        >
          <Building2 size={18} />
          <span>{i + 1}</span>
        </button>
      ))}
      <div className="map-caption">
        <MapPin size={14} />
        {t('Illustrative map · sample locations', 'نمونہ نقشہ · مثالی مقامات')}
      </div>
    </div>
  );
}
