import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';
export function Delivery() {
  const { db, role, actor, t, mutate } = useApp();
  if (role !== 'admin') return <AccessDenied />;
  return (
    <>
      <PageTitle
        title={t('Notification delivery failures', 'اطلاعات کی ترسیل کی ناکامیاں')}
      />
      <Alert>
        {t(
          'Retries are processed by the notification worker. Delivery actions never approve or reject a submission.',
          'اطلاعات کی ترسیل کا نظام دوبارہ کوشش کرتا ہے۔ اس کارروائی سے درخواست منظور یا مسترد نہیں ہوتی۔',
        )}
      </Alert>
      {(db.deliveryJobs ?? []).map((j) => (
        <Panel key={j.id} title={j.id}>
          <Badge tone="amber">{tr(j.state)}</Badge>
          <p>
            {j.target} · {j.attempts} {t('attempts', 'کوششیں')}
          </p>
          <p>{j.error}</p>
          <details>
            <summary>{t('Attempt history', 'کوششوں کی تاریخ')}</summary>
            {j.history.map((h, i) => (
              <p key={i}>{h}</p>
            ))}
          </details>
          <div className="row wrap">
            <button
              disabled={j.state === 'Retry queued'}
              onClick={async () => {
                try {
                  return await mutate('/management/delivery/' + j.id + '/retry', {});
                } catch {
                  return;
                }
              }}
            >
              {t('Queue retry', 'دوبارہ کوشش قطار میں رکھیں')}
            </button>
            <button
              className="secondary"
              disabled={j.state === 'Escalated'}
              onClick={async () => {
                try {
                  return await mutate('/management/delivery/' + j.id + '/escalate', {
                    reason: 'Delivery failure requires investigation',
                  });
                } catch {
                  return;
                }
              }}
            >
              {t('Escalate failure', 'ناکامی حوالے کریں')}
            </button>
          </div>
        </Panel>
      ))}
    </>
  );
}
