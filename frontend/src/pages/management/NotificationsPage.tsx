import { ArrowRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';

export function Notifications() {
  const { db, role, update, t } = useApp();
  const rows = db.notifications.filter((n) => n.role === role);
  return (
    <>
      <PageTitle
        title={t('Your notifications', 'آپ کی اطلاعات')}
        action={
          <button
            className="secondary"
            onClick={() =>
              update((d) => ({
                ...d,
                notifications: d.notifications.map((n) =>
                  n.role === role ? { ...n, read: true } : n,
                ),
              }))
            }
          >
            {t('Mark all read', 'سب پڑھی ہوئی نشان زد')}
          </button>
        }
      />
      <Alert>
        {t(
          'Reading a notification does not resolve its review task or approve a submission.',
          'اطلاع پڑھنے سے جائزہ مکمل یا درخواست منظور نہیں ہوتی۔',
        )}
      </Alert>
      <Panel className="spaced">
        {rows.map((n) => (
          <div className="venue-list-row" key={n.id}>
            <span className="icon-tile">
              <Bell />
            </span>
            <Link
              to={n.href}
              onClick={() =>
                update((d) => ({
                  ...d,
                  notifications: d.notifications.map((x) =>
                    x.id === n.id ? { ...x, read: true } : x,
                  ),
                }))
              }
            >
              <strong>{n.title}</strong>
              <small>
                {n.read ? t('Read', 'پڑھی گئی') : t('Unread', 'نہیں پڑھی گئی')}
              </small>
            </Link>
            <ArrowRight size={17} />
          </div>
        ))}
        {!rows.length && (
          <Empty title={t('You’re all caught up', 'تمام اطلاعات دیکھ لی گئیں')} />
        )}
      </Panel>
    </>
  );
}
