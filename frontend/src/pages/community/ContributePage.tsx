import { ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';

export function Contribute() {
  const { t } = useApp();
  return (
    <div className="container narrow-wide">
      <PageTitle
        eyebrow={t('BUILT BY THE COMMUNITY', 'کمیونٹی کی کاوش')}
        title={t(
          'Be the reason someone finds their Jama’at.',
          'کسی کو جماعت تک پہنچانے کا ذریعہ بنیں۔',
        )}
        description={t(
          'A little local knowledge can make a meaningful difference. Help maintain information you know and people can trust.',
          'آپ کی مقامی معلومات اہم فرق پیدا کر سکتی ہیں۔ قابل اعتماد معلومات فراہم کرنے میں مدد کریں۔',
        )}
      />
      <div className="two-grid">
        <Panel>
          <div className="icon-tile">
            <Building2 />
          </div>
          <h2>{t('Local Representative', 'مقامی نمائندہ')}</h2>
          <p>
            {t(
              'Keep assigned mosque profiles and timetables current. Submit changes for independent review and follow up on reports.',
              'اپنی مسجد کے اوقات اور معلومات درست رکھیں۔ تبدیلیاں تصدیق کے لیے بھیجیں۔',
            )}
          </p>
          <ul className="check-list">
            <li>{t('Maintain a mosque you know', 'اپنی واقف مسجد کی دیکھ بھال')}</li>
            <li>{t('Confirm unchanged timings regularly', 'اوقات کی باقاعدہ تصدیق')}</li>
            <li>{t('Respond to corrections and feedback', 'اصلاحات اور آرا کا جواب')}</li>
          </ul>
          <ButtonLink to="/apply?role=representative">
            {t('Apply as representative', 'نمائندے کے لیے درخواست')}
            <ArrowRight size={17} />
          </ButtonLink>
        </Panel>
        <Panel>
          <div className="icon-tile">
            <ShieldCheck />
          </div>
          <h2>{t('Focal Person', 'فوکل پرسن')}</h2>
          <p>
            {t(
              'Support your area’s representatives. Call registered Imams, independently verify submissions and help resolve local issues.',
              'نمائندوں کی مدد کریں، امام سے فون پر تصدیق کریں اور مسائل حل کریں۔',
            )}
          </p>
          <ul className="check-list">
            <li>
              {t('Review within your assigned area', 'اپنے علاقے کی درخواستوں کا جائزہ')}
            </li>
            <li>
              {t('Record exact-version verification', 'درست ورژن کی تصدیق درج کریں')}
            </li>
            <li>
              {t('Coordinate responsible coverage', 'ذمہ دارانہ دیکھ بھال میں تعاون')}
            </li>
          </ul>
          <ButtonLink to="/apply?role=focal">
            {t('Apply as Focal Person', 'فوکل پرسن کے لیے درخواست')}
            <ArrowRight size={17} />
          </ButtonLink>
        </Panel>
      </div>
      <Alert>
        {t(
          'Initial roles are voluntary. Applying does not grant management access. Contact and reference checks precede an invitation and assignment.',
          'ابتدائی کردار رضاکارانہ ہیں۔ درخواست سے انتظامی رسائی نہیں ملتی؛ پہلے رابطہ اور حوالہ چیک ہوگا۔',
        )}
      </Alert>
      <div className="suggest-strip">
        <div>
          <h3>
            {t('Just want to suggest a mosque?', 'صرف مسجد کی تجویز دینا چاہتے ہیں؟')}
          </h3>
          <p>
            {t(
              'You do not need to volunteer to help us find a missing mosque.',
              'مسجد کی تجویز دینے کے لیے رضاکار بننا ضروری نہیں۔',
            )}
          </p>
        </div>
        <ButtonLink secondary to="/suggest">
          {t('Suggest a mosque', 'مسجد تجویز کریں')}
        </ButtonLink>
      </div>
      <Link className="text-link" to="/guidelines">
        {t('Read contributor guidelines', 'رضاکاروں کی رہنمائی پڑھیں')}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
