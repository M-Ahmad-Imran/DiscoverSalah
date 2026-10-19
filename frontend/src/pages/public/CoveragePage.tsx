import { ArrowRight, MapPin } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';

export function Coverage() {
  const { db, t } = useApp();
  return (
    <div className="container narrow-wide">
      <PageTitle
        eyebrow={t('GROWING WITH CARE', 'ذمہ داری کے ساتھ آگے بڑھنا')}
        title={t('Participating areas & coverage', 'شریک علاقے اور دستیابی')}
        description={t(
          'Whole City includes participating venues. A missing result does not mean there is no mosque nearby.',
          'پورے شہر کی تلاش میں شریک مساجد شامل ہیں۔ نتیجہ نہ ملنے کا مطلب مسجد کا نہ ہونا نہیں۔',
        )}
      />
      <Alert>
        {t(
          'Lahore is the sample dataset, not a confirmed launch city.',
          'لاہور نمونہ ڈیٹا ہے، منظور شدہ آغاز کا شہر نہیں۔',
        )}
      </Alert>
      <div className="three-grid">
        {db.areas.map((a) => (
          <Panel key={a.name}>
            <MapPin className="green-text" />
            <h2>{a.name}</h2>
            <p>{a.city}</p>
            <Badge tone={a.focal ? 'green' : 'amber'}>
              {t(
                a.focal ? 'Reviewer assigned' : 'Reviewer needed',
                a.focal ? 'نگران مقرر' : 'نگران درکار',
              )}
            </Badge>
            <p>
              {db.venues.filter((v) => v.area === a.name).length}{' '}
              {t('sample venues', 'نمونہ مقامات')}
            </p>
            <ButtonLink
              secondary
              to={'/results?scope=city&area=' + encodeURIComponent(a.name)}
            >
              {t('Explore area', 'علاقہ دیکھیں')}
              <ArrowRight size={16} />
            </ButtonLink>
          </Panel>
        ))}
      </div>
      <div className="community-banner">
        <div>
          <h2>
            {t('Help put your community on the map', 'اپنی کمیونٹی کو نقشے پر لائیں')}
          </h2>
          <p>
            {t(
              'Suggest a mosque or apply to help maintain its information.',
              'مسجد تجویز کریں یا معلومات کی دیکھ بھال کے لیے درخواست دیں۔',
            )}
          </p>
        </div>
        <ButtonLink to="/contribute">{t('Get involved', 'شامل ہوں')}</ButtonLink>
      </div>
    </div>
  );
}
