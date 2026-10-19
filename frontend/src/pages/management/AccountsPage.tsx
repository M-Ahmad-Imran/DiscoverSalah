import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { roleNames } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
import { uid } from '../../utils/id';

export function Accounts({ representatives = false }: { representatives?: boolean }) {
  const { db, role, actor, update, t } = useApp();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  if (role === 'representative') return <AccessDenied />;
  const list = db.accounts.filter(
    (a) =>
      (role === 'admin' ||
        (a.role === 'representative' &&
          db.areas.some((area) => area.name === a.area && area.focal === actor))) &&
      (!representatives || a.role === 'representative') &&
      (roleFilter === 'All' || a.role === roleFilter) &&
      a.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title={t(
          representatives ? 'Local representatives' : 'Management accounts',
          representatives ? 'مقامی نمائندے' : 'انتظامی اکاؤنٹس',
        )}
        description={t(
          'Invitations and assignments determine access. Each account belongs to one person.',
          'دعوت اور ذمہ داری رسائی طے کرتی ہے۔ ہر اکاؤنٹ ایک شخص کا ہے۔',
        )}
        action={
          <ButtonLink to="/manage/accounts/invite">
            <Plus size={18} />
            {t('Invite account', 'اکاؤنٹ کو دعوت')}
          </ButtonLink>
        }
      />
      <input
        className="search-input"
        aria-label="Search accounts"
        placeholder={t('Search by name…', 'نام سے تلاش…')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {role === 'admin' && !representatives && (
        <select
          aria-label="Filter account role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="All">All roles</option>
          <option value="focal">Focal Persons</option>
          <option value="representative">Representatives</option>
          <option value="admin">Administrators</option>
        </select>
      )}
      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Name', 'نام')}</th>
                <th>{t('Role / scope', 'کردار / دائرہ')}</th>
                <th>{t('Status', 'حیثیت')}</th>
                <th>{t('Actions', 'اعمال')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={'/manage/accounts/' + a.id}>
                      <strong>{a.name}</strong>
                    </Link>
                    <small>{a.id}</small>
                  </td>
                  <td>
                    {roleNames[a.role]}
                    <small>{a.area}</small>
                  </td>
                  <td>
                    <Badge tone={a.active ? 'green' : 'amber'}>{a.status}</Badge>
                  </td>
                  <td>
                    <div className="row wrap">
                      <Link
                        className="text-link"
                        to={'/manage/assignments?account=' + a.id}
                      >
                        {t('Assignments', 'ذمہ داریاں')}
                      </Link>
                      {a.id !== actor && (
                        <button
                          className="secondary"
                          onClick={() => {
                            if (
                              window.confirm(
                                t(
                                  'Change this account’s access? Existing assignments are preserved in history.',
                                  'اکاؤنٹ کی رسائی بدلیں؟ تاریخ محفوظ رہے گی۔',
                                ),
                              )
                            )
                              update((d) => ({
                                ...d,
                                accounts: d.accounts.map((x) =>
                                  x.id === a.id
                                    ? {
                                        ...x,
                                        active: false,
                                        status: 'Deactivated',
                                      }
                                    : x,
                                ),
                                venues: d.venues.map((v) =>
                                  v.rep === a.id
                                    ? {
                                        ...v,
                                        rep: '',
                                        status:
                                          v.status === 'Published'
                                            ? 'Maintenance pending'
                                            : v.status,
                                      }
                                    : v.focal === a.id
                                      ? {
                                          ...v,
                                          focal: '',
                                          status:
                                            v.status === 'Draft'
                                              ? 'Draft'
                                              : 'Maintenance pending',
                                        }
                                      : v.backup?.reviewer === a.id
                                        ? { ...v, backup: undefined }
                                        : v,
                                ),
                                audit: [
                                  {
                                    id: uid('A'),
                                    action: 'Account deactivated: ' + a.name,
                                    actor,
                                    at: new Date().toISOString(),
                                    target: a.id,
                                  },
                                  ...d.audit,
                                ],
                              }));
                          }}
                          disabled={!a.active}
                        >
                          {t('Deactivate', 'غیر فعال کریں')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
