import {
ArrowRight,
Building2,
CalendarDays,
HeartHandshake,
Info,
Map as MapIcon,
MapPin,
Navigation,
ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapPreview } from '../../components/discovery/MapPreview';
import { MosqueArt } from '../../components/discovery/MosqueArt';
import { MosqueCard } from '../../components/discovery/MosqueCard';
import { SearchControls } from '../../components/discovery/SearchControls';
import { TrustNote } from '../../components/discovery/TrustNote';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useQuery } from '../../hooks/useDiscoveryQuery';
import { useSessions } from '../../hooks/useSessions';

export function Home() {
  const { t } = useApp();
  const sessions = useSessions().slice(0, 3);
  const { query } = useQuery();
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="green-dot" />
            {t('ROOTED IN COMMUNITY. OPEN TO EVERYONE.', 'کمیونٹی کی خدمت۔ سب کے لیے۔')}
          </div>
          <h1>
            {t('Find a mosque.', 'مسجد تلاش کریں۔')}
            <br />
            <span>{t('Know the Jama’at time.', 'جماعت کا وقت جانیں۔')}</span>
          </h1>
          <p>
            {t(
              'Mosque-specific prayer times, maintained by local people. Find your next congregation, wherever the day takes you.',
              'مقامی لوگوں کے فراہم کردہ مسجد کے مخصوص اوقات۔ اپنی اگلی جماعت تلاش کریں۔',
            )}
          </p>
          <div className="hero-proof">
            <span>
              <ShieldCheck size={17} />
              {t('Accountable verification', 'ذمہ دارانہ تصدیق')}
            </span>
            <span>
              <HeartHandshake size={17} />
              {t('Free public access', 'مفت عوامی رسائی')}
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <MosqueArt />
          <div className="hero-floating">
            <span className="icon-tile">
              <Building2 size={22} />
            </span>
            <div>
              <strong>{t('A place to pray.', 'نماز کی جگہ۔')}</strong>
              <small>{t('A community to belong to.', 'ایک کمیونٹی سے تعلق۔')}</small>
            </div>
          </div>
          <span className="illustration-label">
            {t('Community mosque illustration', 'مسجد کی تمثیلی تصویر')}
          </span>
        </div>
      </section>
      <SearchControls />
      <section className="discovery-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">
              {t('EXPLORE PARTICIPATING MOSQUES', 'شریک مساجد دریافت کریں')}
            </p>
            <h2>
              {t(
                'Your next congregation starts here',
                'آپ کی اگلی جماعت یہاں سے شروع ہوتی ہے',
              )}
            </h2>
          </div>
          <Link className="text-link" to="/results">
            {t('View all results', 'تمام نتائج')}
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="discovery-grid">
          <div className="stack">
            {sessions.length ? (
              sessions.map((s) => (
                <MosqueCard
                  key={s.venue.id + s.id}
                  venue={s.venue}
                  sessionId={s.id}
                  time={s.time}
                  prayer={query.prayer}
                  provisional={s.provisional}
                />
              ))
            ) : (
              <Empty
                title={t(
                  'No upcoming sessions for this selection',
                  'اس انتخاب کے لیے آئندہ جماعت دستیاب نہیں',
                )}
                description={t(
                  'Choose another date or prayer above. Coverage is limited to participating mosques.',
                  'اوپر تاریخ یا نماز تبدیل کریں۔',
                )}
              />
            )}
          </div>
          <aside className="stack">
            <Panel title={t('Around your community', 'آپ کی کمیونٹی کے آس پاس')}>
              <MapPreview
                items={sessions.map((s) => s.venue)}
                onSelect={(id) => window.location.assign('/mosque/' + id)}
              />
              <p className="small muted">
                {t(
                  'Choose a participating mosque and open Google Maps for directions.',
                  'شریک مساجد دیکھیں اور راستے کے لیے گوگل میپس کھولیں۔',
                )}
              </p>
              <ButtonLink secondary to="/map">
                <MapIcon size={18} />
                {t('Explore locations', 'مقامات دیکھیں')}
              </ButtonLink>
            </Panel>
            <Panel>
              <TrustNote />
              <Link className="text-link" to="/timing-status">
                {t('Understand timing status', 'اوقات کی حیثیت سمجھیں')}
                <ArrowRight size={16} />
              </Link>
            </Panel>
            <div className="quiet-note">
              <Info size={18} />
              <p>
                {t(
                  'Whole City searches participating mosques, not every mosque in the city.',
                  'پورے شہر کی تلاش صرف شریک مساجد میں ہوتی ہے۔',
                )}
              </p>
            </div>
          </aside>
        </div>
      </section>
      <section className="how-section">
        <p className="eyebrow">
          {t('SIMPLE STEPS. A CLEARER JOURNEY.', 'آسان مراحل۔ واضح سفر۔')}
        </p>
        <h2>{t('Less searching. More peace of mind.', 'کم تلاش۔ زیادہ اطمینان۔')}</h2>
        <div className="three-grid">
          {[
            [
              MapPin,
              'Choose your location',
              'اپنا مقام منتخب کریں',
              'Use your location or choose a starting point.',
              'اپنا مقام استعمال کریں یا ابتدائی مقام منتخب کریں۔',
            ],
            [
              CalendarDays,
              'Find your Jama’at',
              'جماعت تلاش کریں',
              'Compare mosque-specific times and verification status.',
              'مسجد کے اوقات اور تصدیق کا موازنہ کریں۔',
            ],
            [
              Navigation,
              'Make your way',
              'روانہ ہوں',
              'Check the entrance and open directions when ready.',
              'داخلی دروازہ دیکھیں اور راستہ کھولیں۔',
            ],
          ].map(([I, en, ur, desc, urdu], i) => {
            const Icon = I as typeof MapPin;
            return (
              <article key={en as string}>
                <span className="step-number">0{i + 1}</span>
                <Icon size={27} />
                <h3>{t(en as string, ur as string)}</h3>
                <p>{t(desc as string, urdu as string)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <div className="community-banner">
        <HeartHandshake size={38} />
        <div>
          <h2>
            {t(
              'Good information begins with good neighbours.',
              'اچھی معلومات کا آغاز اچھے پڑوسیوں سے ہوتا ہے۔',
            )}
          </h2>
          <p>
            {t(
              'Help keep your local mosque connected to its community.',
              'اپنی مسجد کو کمیونٹی سے جوڑنے میں مدد کریں۔',
            )}
          </p>
        </div>
        <ButtonLink to="/contribute">
          {t('Become a contributor', 'رضاکار بنیں')}
          <ArrowRight size={18} />
        </ButtonLink>
      </div>
    </div>
  );
}
