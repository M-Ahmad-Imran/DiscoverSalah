import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { deliveryFixtures } from '../../data/deliveryFixtures';
import { updateDelivery } from '../../domain/delivery';
import { useApp } from '../../hooks/useApp';
export function Delivery() {
  const { db, role, actor, t, update } = useApp();
  if (role !== 'admin') return <AccessDenied />;
  return (
    <>
      <PageTitle
        title={t('Notification delivery failures', 'اطلاعات کی ترسیل کی ناکامیاں')}
      />
      <Alert>
        {t(
          'Sample outbox records. Retry requests remain queued until a real worker is connected. These actions never approve or reject a submission.',
          'نمونہ ترسیلی ریکارڈ۔ حقیقی سرور کے بغیر دوبارہ کوشش قطار میں رہے گی۔ درخواست کی منظوری تبدیل نہیں ہوگی۔',
        )}
      </Alert>
      {(db.deliveryJobs ?? deliveryFixtures).map((j) => (
        <Panel key={j.id} title={j.id}>
          <Badge tone="amber">{j.state}</Badge>
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
              onClick={() =>
                update((d) =>
                  updateDelivery(d, j.id, 'retry', actor, new Date().toISOString()),
                )
              }
            >
              {t('Queue retry', 'دوبارہ کوشش قطار میں رکھیں')}
            </button>
            <button
              className="secondary"
              disabled={j.state === 'Escalated'}
              onClick={() =>
                update((d) =>
                  updateDelivery(d, j.id, 'escalate', actor, new Date().toISOString()),
                )
              }
            >
              {t('Escalate failure', 'ناکامی حوالے کریں')}
            </button>
          </div>
        </Panel>
      ))}
    </>
  );
}
