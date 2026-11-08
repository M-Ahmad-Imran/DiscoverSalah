import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { resolveSpecial } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';
import { tr } from '../../i18n/translate';
import { today } from '../../utils/date';
import { TimetableFollowUp } from '../../components/management/TimetableFollowUp';
import { useScreenFilter } from '../../hooks/useScreenFilter';

export function Maintenance() {
  const { db, role, t, mutate } = useApp();
  const venues = useScopedVenues();
  const [freshness, setFreshness] = useScreenFilter('freshness', 'all');
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
          'Representatives check times every 7 days. After 14 days, call or visit. Overdue confirmation does not automatically mean incorrect times or remove a mosque.',
          'نمائندے ہر ۷ دن بعد اوقات چیک کریں۔ ۱۴ دن بعد فون یا ملاقات کریں۔ تاخیر کا مطلب غلط اوقات نہیں اور مسجد خود بخود نہیں ہٹے گی۔',
        )}
      </Alert>
      <label>
        {t('Confirmation status', 'تصدیق کی حالت')}{' '}
        <select value={freshness} onChange={(e) => setFreshness(e.target.value)}>
          <option value="all">{t('All mosques', 'تمام مساجد')}</option>
          <option value="due">
            {t('7+ days: confirmation due', '۷ دن: تصدیق درکار')}
          </option>
          <option value="overdue">
            {t('14+ days: follow-up needed', '۱۴ دن: رابطہ درکار')}
          </option>
        </select>
      </label>
      <div className="two-grid spaced">
        {venues.map((v) => (
          <Panel key={v.id} title={v.name}>
            <p>
              {t(v.freshness?.status || 'Not recorded')} · {v.freshness?.days ?? '—'}{' '}
              {t('days', 'دن')}
            </p>
            {v.lastFollowUpAt && (
              <p>
                {t('Last follow-up', 'آخری رابطہ')}: {v.lastFollowUpAt.slice(0, 10)} ·{' '}
                {t(v.lastFollowUpOutcome || '')}
              </p>
            )}
            <TimetableFollowUp venue={v} />
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
              <dd>{db.counts?.['reports:' + v.id] ?? 0}</dd>
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
            {role === 'admin' && v.status !== 'Draft' && (
              <div className="row wrap">
                {['Published', 'Suspended', 'Maintenance pending']
                  .filter((status) => status !== v.status)
                  .map((status) => (
                    <button
                      key={status}
                      className="secondary"
                      onClick={async () => {
                        const reason = window.prompt(
                          'Reason for changing venue status to ' + status,
                        );
                        if (!reason || reason.trim().length < 5) return;
                        try {
                          await mutate('/management/venues/' + v.id + '/status', {
                            revision: v.revision,
                            status,
                            reason,
                          });
                        } catch {
                          return;
                        }
                      }}
                    >
                      {tr(status)}
                    </button>
                  ))}
              </div>
            )}
            <Link className="text-link" to={'/manage/mosques/' + v.id}>
              {t('Open mosque workspace', 'مسجد کا انتظام کھولیں')}
            </Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
