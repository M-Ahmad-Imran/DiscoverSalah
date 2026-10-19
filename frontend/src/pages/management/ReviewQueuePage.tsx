import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { reviewItems } from '../../domain/reviewQueue';
import { useApp } from '../../hooks/useApp';
import { today } from '../../utils/date';
export function ReviewQueue() {
  const { db, role, actor, t } = useApp();
  const [type, setType] = useState('All');
  const [venue, setVenue] = useState('');
  const [due, setDue] = useState('All');
  const [urgent, setUrgent] = useState(false);
  if (!role || role === 'representative') return <AccessDenied />;
  const items = reviewItems(db, role, actor);
  const rows = items.filter(
    (x) =>
      (type === 'All' || x.type === type) &&
      (!venue || x.venueId === venue) &&
      (!urgent || x.urgent) &&
      (due === 'All' ||
        (due === 'Today or earlier'
          ? !!x.due && x.due <= today()
          : !!x.due && x.due > today())),
  );
  return (
    <>
      <PageTitle
        title={t('Combined review queue', 'مشترکہ جائزہ قطار')}
        description={t(
          'All review types in one place. Event dates are not review deadlines; no unapproved deadline is assumed.',
          'تمام جائزے ایک جگہ۔ تقریب کی تاریخ جائزے کی آخری تاریخ نہیں ہے۔',
        )}
      />
      <Panel>
        <div className="three-grid">
          <Field label={t('Review type', 'جائزے کی قسم')}>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {['All', ...new Set(items.map((x) => x.type))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label={t('Mosque', 'مسجد')}>
            <select value={venue} onChange={(e) => setVenue(e.target.value)}>
              <option value="">{t('All assigned mosques', 'تمام مقررہ مساجد')}</option>
              {db.venues
                .filter((v) => items.some((x) => x.venueId === v.id))
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t('Event / effective date', 'تقریب / لاگو تاریخ')}>
            <select value={due} onChange={(e) => setDue(e.target.value)}>
              {['All', 'Today or earlier', 'Future dated'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
          />
          {t('Escalated work only', 'صرف فوری حوالے')}
        </label>
      </Panel>
      <Panel>
        {rows.map((x) => (
          <Link className="list-row" key={x.type + x.id} to={x.href}>
            <div>
              <strong>{x.title}</strong>
              <p>
                {x.id} · {x.type} {x.due && ' · ' + x.due}
              </p>
            </div>
            <Badge tone={x.urgent ? 'amber' : 'neutral'}>
              {x.urgent ? t('Escalated', 'حوالہ شدہ') : t('Review', 'جائزہ')}
            </Badge>
          </Link>
        ))}
        {!rows.length && (
          <Empty title={t('No matching review tasks', 'کوئی متعلقہ جائزہ نہیں')} />
        )}
      </Panel>
    </>
  );
}
