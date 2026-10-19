import { today } from '../../utils/date';
import { resolveSpecial } from '../../domain/schedules';
import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';

export function Maintenance() {
  const { db, role, t } = useApp();
  const venues = useScopedVenues();
  if (role === 'representative') return <AccessDenied />;
  return (
    <>
      <PageTitle
        title={t('Maintenance & coverage', 'دیکھ بھال اور دستیابی')}
        description={t(
          'Review ownership gaps and recorded evidence before expanding coverage.',
          'دستیابی بڑھانے سے پہلے ذمہ داری اور شواہد کا جائزہ لیں۔',
        )}
      />
      <Alert>
        {t(
          'Dates are evidence, not expiry guarantees. A freshness threshold has not yet been approved.',
          'تاریخیں شواہد ہیں، درستگی کی ضمانت نہیں۔ تازگی کی مدت ابھی منظور نہیں ہوئی۔',
        )}
      </Alert>
      <div className="two-grid spaced">
        {venues.map((v) => (
          <Panel key={v.id} title={v.name}>
            <Badge tone={v.rep && v.focal ? 'green' : 'amber'}>
              {t(
                v.rep && v.focal ? 'Assigned ownership' : 'Ownership gap',
                v.rep && v.focal ? 'ذمہ دار مقرر' : 'ذمہ داری کی کمی',
              )}
            </Badge>
            <dl className="definition-list">
              <dt>{t('Area', 'علاقہ')}</dt>
              <dd>{v.area}</dd>
              <dt>{t('Representative reconfirmation', 'نمائندے کی دوبارہ تصدیق')}</dt>
              <dd>{v.reconfirmed || t('Not recorded', 'درج نہیں')}</dd>
              <dt>{t('Imam phone verification', 'امام سے فون تصدیق')}</dt>
              <dd>{v.phoneVerified || t('Not recorded', 'درج نہیں')}</dd>
              <dt>{t('Oldest pending review', 'سب سے پرانا زیر التوا جائزہ')}</dt>
              <dd>
                {db.proposals
                  .filter((p) => p.venueId === v.id && p.state === 'Submitted')
                  .map((p) => p.created.slice(0, 10))
                  .sort()[0] || '—'}
              </dd>
              <dt>{t('Unresolved reports', 'غیر حل شدہ رپورٹس')}</dt>
              <dd>
                {
                  db.requests.filter(
                    (r) =>
                      r.kind === 'report' &&
                      r.values.venue === v.id &&
                      !['Resolved', 'Dismissed'].includes(r.status),
                  ).length
                }
              </dd>
              <dt>{t('Upcoming dated sessions', 'آئندہ تاریخ وار جماعتیں')}</dt>
              <dd>
                {resolveSpecial(v, db.proposals, today())
                  .filter((s) => s.date >= today() && !s.canceled)
                  .map(
                    (s) =>
                      s.prayer + ' · ' + s.date + (s.provisional ? ' · Provisional' : ''),
                  )
                  .join('; ') || '—'}
              </dd>
              <dt>{t('Pending proposals', 'زیر التوا تجاویز')}</dt>
              <dd>
                {
                  db.proposals.filter(
                    (p) => p.venueId === v.id && p.state === 'Submitted',
                  ).length
                }
              </dd>
            </dl>
            <Link className="text-link" to={'/manage/mosques/' + v.id}>
              {t('Open mosque workspace', 'مسجد کا انتظام کھولیں')}
            </Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
