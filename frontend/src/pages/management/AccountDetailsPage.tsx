import { Link, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { roleNames } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
export function AccountDetails() {
  const { id } = useParams();
  const { db, role, actor, t } = useApp();
  const account = db.accounts.find((a) => a.id === id);
  const venues = db.venues.filter(
    (v) => v.rep === id || v.focal === id || v.backup?.reviewer === id,
  );
  if (
    !account ||
    role === 'representative' ||
    (role !== 'admin' &&
      (account.role !== 'representative' ||
        !db.areas.some((a) => a.name === account.area && a.focal === actor)))
  )
    return <AccessDenied />;
  const visible = venues.filter((v) => role === 'admin' || v.focal === actor);
  return (
    <>
      <PageTitle
        title={account.name}
        description={roleNames[account.role] + ' · ' + account.area}
        action={<Badge tone={account.active ? 'green' : 'amber'}>{account.status}</Badge>}
      />
      <div className="detail-grid">
        <Panel title={t('Assignments & workload', 'ذمہ داریاں اور کام')}>
          {visible.map((v) => (
            <Link className="list-row" key={v.id} to={'/manage/mosques/' + v.id}>
              <div>
                <strong>{v.name}</strong>
                <p>
                  {v.status} ·{' '}
                  {
                    db.proposals.filter(
                      (p) => p.venueId === v.id && p.state === 'Submitted',
                    ).length
                  }{' '}
                  {t('pending reviews', 'زیر التوا جائزے')}
                </p>
                <p>
                  {t('Representative confirmation', 'نمائندے کی تصدیق')}:{' '}
                  {v.reconfirmed || '—'}
                </p>
              </div>
            </Link>
          ))}
          {!visible.length && (
            <Empty title={t('No mosque assignments', 'کوئی مسجد مقرر نہیں')} />
          )}
          <ButtonLink to={'/manage/assignments?account=' + id}>
            {t('Manage assignment', 'ذمہ داری کا انتظام')}
          </ButtonLink>
        </Panel>
        <Panel
          title={t('Account and assignment history', 'اکاؤنٹ اور ذمہ داری کی تاریخ')}
        >
          {db.audit
            .filter(
              (a) =>
                (a.target === id || a.actor === id || a.action.includes(id!)) &&
                (role === 'admin' || visible.some((v) => v.id === a.target)),
            )
            .map((a) => (
              <div className="list-row" key={a.id}>
                <div>
                  {a.action}
                  <small>{new Date(a.at).toLocaleString()}</small>
                </div>
              </div>
            ))}
          <Link to="/manage/accounts">{t('Back to accounts', 'اکاؤنٹس پر واپس')}</Link>
        </Panel>
      </div>
    </>
  );
}
