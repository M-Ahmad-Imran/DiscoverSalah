import { useApp } from '../../hooks/useApp';
import { ButtonLink } from '../ui/ButtonLink';
import { Empty } from '../ui/Empty';

export function AccessDenied() {
  const { t } = useApp();
  return (
    <Empty
      title={t(
        'This record is outside your assignment',
        'یہ ریکارڈ آپ کی ذمہ داری سے باہر ہے',
      )}
      description={t(
        'Return to your workspace or contact your administrator.',
        'اپنی ورک اسپیس پر واپس جائیں یا منتظم سے رابطہ کریں۔',
      )}
      action={
        <ButtonLink to="/manage">{t('Back to overview', 'خلاصے پر واپس')}</ButtonLink>
      }
    />
  );
}
