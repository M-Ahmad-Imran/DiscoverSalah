import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';

export function Dashboard() {
  const { db, role, t } = useApp();
  const venues = useScopedVenues();
  const proposals = db.proposals.filter((p) => venues.some((v) => v.id === p.venueId));
  const pending = proposals.filter((p) => p.state === 'Submitted');
  const isRep = role === 'representative';
  return (
    <>
      <PageTitle
        eyebrow={t('YOUR COMMUNITY, CONNECTED', 'آپ کی کمیونٹی، باہم مربوط')}
        title={t(
          isRep
            ? 'Your mosque responsibilities'
            : role === 'focal'
              ? 'Your area review dashboard'
              : 'Service administration',
          isRep
            ? 'آپ کی مساجد کی ذمہ داریاں'
            : role === 'focal'
              ? 'آپ کے علاقے کا جائزہ'
              : 'سروس انتظامیہ',
        )}
        description={t(
          isRep
            ? 'Keep information current. Help your community pray together.'
            : 'A clear view of the people, places and updates that need your attention.',
          isRep
            ? 'معلومات درست رکھیں۔ کمیونٹی کی باجماعت نماز میں مدد کریں۔'
            : 'ان افراد، مقامات اور تبدیلیوں پر نظر رکھیں جنہیں آپ کی توجہ درکار ہے۔',
        )}
        action={
          <ButtonLink
            to={role === 'admin' ? '/manage/accounts/invite' : '/manage/register'}
          >
            <Plus size={18} />
            {t(
              role === 'admin' ? 'Invite Focal Person' : 'Register mosque',
              role === 'admin' ? 'فوکل پرسن کو دعوت' : 'مسجد درج کریں',
            )}
          </ButtonLink>
        }
      />
      <div className="stats-grid">
        {[
          [
            Building2,
            venues.length,
            isRep ? 'Assigned mosques' : 'Participating mosques',
            'شریک مساجد',
            '/manage/mosques',
          ],
          [
            ClipboardList,
            pending.length,
            'Pending reviews',
            'زیر التوا جائزے',
            '/manage/' + (isRep ? 'submissions' : 'reviews'),
          ],
          [
            Clock,
            venues.filter((v) => v.status !== 'Published').length,
            'Maintenance gaps',
            'دیکھ بھال کی کمی',
            '/manage/mosques?status=Maintenance%20pending',
          ],
          [
            AlertTriangle,
            db.requests.filter((r) => r.kind === 'report' && r.status !== 'Resolved')
              .length,
            'Open issues',
            'کھلے مسائل',
            '/manage/reports',
          ],
        ].map(([I, n, en, ur, path], i) => {
          const Icon = I as typeof Clock;
          return (
            <Link
              className={`stat-card stat-${i}`}
              key={en as string}
              to={path as string}
            >
              <span className="stat-icon">
                <Icon size={22} />
              </span>
              <span className="stat-number">{n as number}</span>
              <strong>{t(en as string, ur as string)}</strong>
              <small>
                {t('View details', 'تفصیلات دیکھیں')}
                <ArrowRight size={13} />
              </small>
            </Link>
          );
        })}
      </div>
      <div className="section-title spaced">
        <div>
          <p className="eyebrow">{t('PRIORITY WORK', 'ترجیحی کام')}</p>
          <h2>{t('Attention required', 'توجہ درکار')}</h2>
        </div>
        <Badge tone="amber">
          {pending.length} {t('pending', 'زیر التوا')}
        </Badge>
      </div>
      {pending.length ? (
        pending.map((p) => (
          <div className="action-card" key={p.id}>
            <span className="icon-tile amber">
              <Clock />
            </span>
            <div>
              <Badge tone="amber">{t('Timetable review', 'اوقات کا جائزہ')}</Badge>
              <h3>{db.venues.find((v) => v.id === p.venueId)?.name}</h3>
              <p>
                {p.id} · {t('Effective', 'لاگو')} {p.effective} · {p.reason}
              </p>
            </div>
            <ButtonLink
              to={isRep ? '/manage/submissions/' + p.id : '/manage/review/' + p.id}
            >
              {t(
                isRep ? 'View submission' : 'Open review',
                isRep ? 'درخواست دیکھیں' : 'جائزہ کھولیں',
              )}
              <ArrowRight size={17} />
            </ButtonLink>
          </div>
        ))
      ) : (
        <Panel>
          <CheckCircle2 className="green-text" />
          <h3>{t('All caught up', 'تمام کام مکمل')}</h3>
          <p>
            {t(
              'There are no pending timetable reviews in your workspace.',
              'آپ کی ورک اسپیس میں اوقات کا کوئی جائزہ زیر التوا نہیں۔',
            )}
          </p>
        </Panel>
      )}
      <div className="dashboard-grid spaced">
        <Panel
          title={t(
            isRep ? 'My assigned mosques' : 'Area health & oversight',
            isRep ? 'میری مقررہ مساجد' : 'علاقے کی حالت اور نگرانی',
          )}
          action={
            <Link className="text-link" to="/manage/mosques">
              {t('View all', 'سب دیکھیں')}
              <ArrowRight size={16} />
            </Link>
          }
        >
          {venues.slice(0, 4).map((v) => (
            <Link key={v.id} to={'/manage/mosques/' + v.id} className="venue-list-row">
              <span className="icon-tile">
                <Building2 size={21} />
              </span>
              <div>
                <strong>{t(v.name, v.urdu)}</strong>
                <small>
                  {v.area} ·{' '}
                  {t(
                    v.status,
                    v.status === 'Published' ? 'شائع شدہ' : 'دیکھ بھال زیر التوا',
                  )}
                </small>
              </div>
              <ChevronRight size={18} />
            </Link>
          ))}
        </Panel>
        <Panel title={t('Recent activity', 'حالیہ سرگرمی')}>
          <div className="timeline">
            {db.audit.slice(0, 4).map((a) => (
              <div key={a.id}>
                <span className="timeline-dot" />
                <strong>{a.action}</strong>
                <small>
                  {a.actor} · {new Date(a.at).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>
          <Link to="/manage/history" className="text-link">
            {t('View activity history', 'سرگرمی کی تاریخ')}
            <ArrowRight size={16} />
          </Link>
        </Panel>
      </div>
      {role === 'admin' && (
        <Panel title={t('Participating areas & supervision', 'شریک علاقے اور نگرانی')}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Area', 'علاقہ')}</th>
                  <th>{t('Focal Person', 'فوکل پرسن')}</th>
                  <th>{t('Coverage', 'دستیابی')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {db.areas.map((a) => (
                  <tr key={a.name}>
                    <td>
                      <strong>{a.name}</strong>
                      <small>{a.city}</small>
                    </td>
                    <td>{db.accounts.find((x) => x.id === a.focal)?.name || '—'}</td>
                    <td>
                      <Badge tone={a.focal ? 'green' : 'amber'}>
                        {t(
                          a.focal ? 'Assigned' : 'Responsibility gap',
                          a.focal ? 'مقرر' : 'ذمہ داری کی کمی',
                        )}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        to={'/manage/assignments?area=' + encodeURIComponent(a.name)}
                      >
                        {t('Manage assignment', 'ذمہ داری کا انتظام')}
                        <ArrowRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
