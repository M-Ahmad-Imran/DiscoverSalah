import { Clock } from 'lucide-react';
import { daily } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
import { urPrayers } from '../../i18n/prayerLabels';
import { timeLabel } from '../../utils/date';
import { Badge } from '../ui/Badge';

export function Timetable({
  times,
  before,
}: {
  times: Record<string, string>;
  before?: Record<string, string>;
}) {
  const { t } = useApp();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('Congregation', 'جماعت')}</th>
            {before && <th>{t('Currently approved', 'موجودہ منظور شدہ')}</th>}
            <th>
              {t(
                before ? 'Proposed time' : 'Jama’at time',
                before ? 'مجوزہ وقت' : 'جماعت کا وقت',
              )}
            </th>
            {before && <th>{t('Change', 'تبدیلی')}</th>}
          </tr>
        </thead>
        <tbody>
          {daily.map((p) => (
            <tr
              key={p}
              className={before && before[p] !== times[p] ? 'highlight-row' : ''}
            >
              <td>
                <span className="row">
                  <Clock size={17} />
                  {t(p, urPrayers[p])}
                </span>
              </td>
              {before && <td dir="ltr">{timeLabel(before[p])}</td>}
              <td dir="ltr" className="time-cell">
                {timeLabel(times[p])}
              </td>
              {before && (
                <td>
                  {before[p] !== times[p] ? (
                    <Badge tone="amber">{t('Changed', 'تبدیل شدہ')}</Badge>
                  ) : (
                    <span className="muted">{t('Unchanged', 'کوئی تبدیلی نہیں')}</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
