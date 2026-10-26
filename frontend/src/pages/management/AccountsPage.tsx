import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { roleNames } from '../../domain/constants';
import { useApp } from '../../hooks/useApp';
import { useScreenFilter } from '../../hooks/useScreenFilter';
import { tr } from '../../i18n/translate';

export function Accounts({ representatives = false }: { representatives?: boolean }) {
  const { db, role, actor, mutate, t } = useApp();
  const [q, setQ] = useScreenFilter('q', '');
  const [roleFilter, setRoleFilter] = useScreenFilter('role', 'All');
  if (role === 'representative') return <AccessDenied />;
  const list = db.accounts.filter(a => (!db.page || db.page.ids.includes(a.id)) && (role === 'admin' || a.role === 'representative'));
  return (
    <>
      <PageTitle
        title={t(
          representatives ? 'Local representatives' : 'Management accounts',
          representatives ? 'مقامی نمائندے' : 'انتظامی اکاؤنٹس',
        )}
        description={t(
          'Issuer-created credentials and assignments determine access. Each account belongs to one person.',
          'مجاز شخص کے بنائے گئے اکاؤنٹ اور مقررہ ذمہ داریوں کے مطابق رسائی ملتی ہے۔ ہر اکاؤنٹ ایک شخص کا ہے۔',
        )}
        action={
          <ButtonLink to="/manage/accounts/invite">
            <Plus size={18} />
            {t('Create credentials', 'اکاؤنٹ کی اسناد بنائیں')}
          </ButtonLink>
        }
      />
      <input
        className="search-input"
        aria-label={tr('Search accounts')}
        placeholder={t('Search by name…', 'نام سے تلاش…')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {role === 'admin' && !representatives && (
        <select
          aria-label={tr('Filter account role')}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="All">{tr('All roles')}</option>
          <option value="focal">{tr('Focal Persons')}</option>
          <option value="representative">{tr('Representatives')}</option>
          <option value="admin">{tr('Administrators')}</option>
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
                    {tr(roleNames[a.role])}
                    <small>{a.area}</small>
                  </td>
                  <td>
                    <Badge tone={a.active ? 'green' : 'amber'}>{tr(a.status)}</Badge>
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
                          onClick={async () => {
                            try {
                              if (
                                window.confirm(
                                  t(
                                    'Change this account’s access? Existing assignments are preserved in history.',
                                    'اکاؤنٹ کی رسائی بدلیں؟ تاریخ محفوظ رہے گی۔',
                                  ),
                                )
                              )
                                await mutate(
                                  '/management/accounts/' + a.id + '/deactivate',
                                  {
                                    authVersion: a.authVersion,
                                    reason: 'Access revoked by authorized management',
                                  },
                                );
                            } catch {
                              return;
                            }
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
