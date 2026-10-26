import {
  ArrowRight,
  Building2,
  CalendarDays,
  Footprints,
  MapPin,
  Navigation,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { isDisputed } from '../../domain/disputes';
import { pendingPrayer } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { prayerUr } from '../../i18n/prayerLabels';
import { tr } from '../../i18n/translate';
import { Venue } from '../../types/index';
import { timeLabel, today } from '../../utils/date';
import { Badge } from '../ui/Badge';
import { ButtonLink } from '../ui/ButtonLink';
import { MosqueArt } from './MosqueArt';
import { status } from './timingLabel';

export function MosqueCard({
  venue: v,
  time,
  prayer,
  provisional = false,
  sessionId = 'daily',
}: {
  venue: Venue;
  time?: string;
  prayer: string;
  provisional?: boolean;
  sessionId?: string;
}) {
  const { t, db } = useApp();
  const { query, params } = useQuery();
  const sessionParams = new URLSearchParams(params);
  sessionParams.set('session', sessionId);
  const suffix = '?' + sessionParams.toString();
  const under = pendingPrayer(v, db.proposals, prayer, query.date);
  return (
    <article className="mosque-card">
      <Link to={'/mosque/' + v.id + suffix} className="mosque-card-image">
        <MosqueArt index={v.image} />
        <span>{v.area}</span>
      </Link>
      <div className="mosque-card-content">
        <div className="row-between">
          <div>
            <Link to={'/mosque/' + v.id + suffix}>
              <h3>{t(v.name, v.urdu)}</h3>
            </Link>
            <p className="location-text">
              <MapPin size={14} />
              {v.area} · {t('Lahore', 'لاہور')}
            </p>
          </div>
          <span className="number-dot">
            <Building2 size={20} />
          </span>
        </div>
        <div className="prayer-highlight">
          <div>
            <small>
              {t(prayer, prayerUr[prayer])} {t('Jama’at', 'جماعت')}
            </small>
            <strong dir="ltr">{timeLabel(time || '')}</strong>
          </div>
          <div className="date-caption">
            <CalendarDays size={16} />
            {query.date === today() ? t('Today', 'آج') : query.date}
            <span>{tr('Asia/Karachi')}</span>
          </div>
        </div>
        <Badge
          tone={
            isDisputed(v, prayer, query.date) ||
            under ||
            v.status !== 'Published' ||
            provisional
              ? 'amber'
              : 'green'
          }
        >
          {provisional
            ? t('Provisional date', 'عارضی تاریخ')
            : status(v, under, t, isDisputed(v, prayer, query.date))}
        </Badge>
        <p className="estimate-note">
          <Footprints size={16} />
          {t(
            'Arrival estimate unavailable · routes not connected',
            'آمد کا اندازہ دستیاب نہیں · راستے منسلک نہیں',
          )}
        </p>
        <div className="card-actions">
          <ButtonLink secondary to={'/mosque/' + v.id + suffix}>
            {t('View details', 'تفصیلات')}
            <ArrowRight size={16} />
          </ButtonLink>
          <ButtonLink to={'/mosque/' + v.id + '/directions' + suffix}>
            <Navigation size={16} />
            {t('Directions', 'راستہ')}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
