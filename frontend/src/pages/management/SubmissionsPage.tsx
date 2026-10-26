import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';
import { useScreenFilter } from '../../hooks/useScreenFilter';
import { tr } from '../../i18n/translate';

export function Submissions({ review = false }: { review?: boolean }) {
  const { db, t, role } = useApp();
  const venues = useScopedVenues(true);
  const [q, setQ] = useScreenFilter('q', '');
  const [filter, setFilter] = useScreenFilter('status', review ? 'Submitted' : 'All');
  if (review && role === 'representative') return <AccessDenied />;
  const rows = db.proposals.filter(p => (!db.page || db.page.ids.includes(p.id)) && venues.some(v => v.id === p.venueId));
  return (
    <>
      <PageTitle
        title={t(
          review ? 'Verification review queue' : 'Timing submissions',
          review ? 'تصدیقی جائزے کی قطار' : 'اوقات کی درخواستیں',
        )}
        description={t(
          'Every submission keeps its own version, history and decision.',
          'ہر درخواست کا اپنا ورژن، تاریخ اور فیصلہ برقرار ہے۔',
        )}
      />
      <div className="results-toolbar">
        <input
          placeholder={t('Search mosque or reference…', 'مسجد یا حوالہ تلاش کریں…')}
          aria-label={tr('Search submissions')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label={tr('Submission status')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['All', 'Submitted', 'Approved', 'Returned', 'Rejected', 'Superseded'].map(
            (s) => (
              <option key={s} value={s}>
                {tr(s)}
              </option>
            ),
          )}
        </select>
      </div>
      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Mosque / version', 'مسجد / ورژن')}</th>
                <th>{t('Effective', 'لاگو')}</th>
                <th>{t('Status', 'حیثیت')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{db.venues.find((v) => v.id === p.venueId)?.name}</strong>
                    <small>
                      {p.id} · v{p.version}
                    </small>
                  </td>
                  <td>{p.effective}</td>
                  <td>
                    <Badge
                      tone={
                        p.state === 'Approved'
                          ? 'green'
                          : p.state === 'Rejected'
                            ? 'red'
                            : 'amber'
                      }
                    >
                      {tr(p.state)}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      to={(review ? '/manage/review/' : '/manage/submissions/') + p.id}
                    >
                      {t(
                        review ? 'Open review' : 'View details',
                        review ? 'جائزہ کھولیں' : 'تفصیلات',
                      )}
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title={t('No matching submissions', 'کوئی متعلقہ درخواست نہیں')} />
        )}
      </Panel>
      {review && (
        <div className="three-grid spaced">
          {[
            ['/manage/registrations', 'Registration reviews', 'اندراجات کا جائزہ'],
            [
              '/manage/contact-changes',
              'Contact & identity changes',
              'رابطے کی تبدیلیاں',
            ],
            ['/manage/notices', 'Notice moderation', 'اعلانات کا جائزہ'],
          ].map(([to, en, ur]) => (
            <ButtonLink secondary key={to} to={to}>
              {t(en, ur)}
              <ArrowRight size={17} />
            </ButtonLink>
          ))}
        </div>
      )}
    </>
  );
}
