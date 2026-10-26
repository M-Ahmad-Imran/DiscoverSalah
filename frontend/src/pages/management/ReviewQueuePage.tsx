import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { RecordSelect } from '../../components/ui/RecordSelect';
import { reviewItems } from '../../domain/reviewQueue';
import { useApp } from '../../hooks/useApp';
import { useScreenFilter } from '../../hooks/useScreenFilter';
import { tr } from '../../i18n/translate';
export function ReviewQueue() {
  const { db, role, actor, t } = useApp();
  const [type, setType] = useScreenFilter('type', 'All');
  const [venue, setVenue] = useScreenFilter('venue', '');
  const [due, setDue] = useScreenFilter('due', 'all');
  const [urgentValue, setUrgent] = useScreenFilter('urgent', 'false');
  const urgent = urgentValue === 'true';
  if (!role || role === 'representative') return <AccessDenied />;
  const items = reviewItems(db, role, actor);
  const rows = items.filter((x) => !db.page || db.page.ids.includes(x.id));
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
              {[
                'All',
                'Timetable',
                'registration',
                'contact-change',
                'profile-change',
                'Notice',
                'report',
                'suggestion',
                'application',
              ].map((x) => (
                <option key={x} value={x}>
                  {tr(x)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Mosque', 'مسجد')}>
            <RecordSelect
              resource="venues"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            >
              <option value="">{t('All assigned mosques', 'تمام مقررہ مساجد')}</option>
              {db.venues
                .filter((v) => items.some((x) => x.venueId === v.id))
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </RecordSelect>
          </Field>
          <Field label={t('Event / effective date', 'تقریب / لاگو تاریخ')}>
            <select value={due} onChange={(e) => setDue(e.target.value)}>
              {['all', 'past', 'future'].map((x) => (
                <option key={x} value={x}>
                  {tr(x)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(String(e.target.checked))}
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
                {x.id} · {tr(x.type)} {x.due && ' · ' + x.due}
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
