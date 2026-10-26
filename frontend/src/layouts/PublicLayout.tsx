import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  HeartHandshake,
  Map,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Brand } from '../components/common/Brand';
import { LocaleButton } from '../components/common/LanguageSwitch';
import { ScreenContent } from '../components/ui/ScreenContent';
import { useApp } from '../hooks/useApp';
import { tr } from '../i18n/translate';

export function PublicLayout() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <>
      <header className="public-header">
        <div className="header-inner">
          <Brand />
          <nav
            className={open ? 'public-nav open' : 'public-nav'}
            aria-label={tr('Main navigation')}
          >
            <NavLink to="/sign-in" className="mobile-management">
              {t('Management', 'انتظامیہ')}
            </NavLink>
            <NavLink to="/" end>
              <MapPin size={17} />
              {t('Find a Mosque', 'مسجد تلاش کریں')}
            </NavLink>
            <NavLink to="/how-it-works">
              <BookOpen size={17} />
              {t('How it works', 'طریقہ کار')}
            </NavLink>
            <NavLink to="/contribute">
              <HeartHandshake size={17} />
              {t('Get involved', 'شامل ہوں')}
            </NavLink>
          </nav>
          <div className="header-actions">
            <LocaleButton />
            <Link to="/sign-in" className="management-link">
              <ShieldCheck size={17} />
              <span>{t('Management', 'انتظامیہ')}</span>
              <ArrowUpRight size={14} />
            </Link>
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(!open)}
              aria-label={tr('Toggle navigation')}
              aria-expanded={open}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="public-main">
        <ScreenContent />
      </main>
      <footer className="footer">
        <div>
          <Brand />
          <p>
            {t(
              'A community effort. A clearer path to prayer.',
              'اجتماعی کوشش۔ نماز تک واضح راستہ۔',
            )}
          </p>
        </div>
        <div className="footer-links">
          {[
            ['/about', 'About', 'تعارف'],
            ['/coverage', 'Coverage', 'دستیابی'],
            ['/help', 'Help', 'مدد'],
            ['/privacy', 'Privacy', 'رازداری'],
            ['/terms', 'Terms', 'شرائط'],
            ['/contact', 'Contact', 'رابطہ'],
            ['/accessibility', 'Accessibility', 'رسائی'],
          ].map(([url, en, ur]) => (
            <Link key={url} to={url}>
              {t(en, ur)}
            </Link>
          ))}
        </div>
        <p className="footer-bottom">
          {t(
            'Free public browsing. No account required.',
            'مفت عوامی رسائی۔ اکاؤنٹ ضروری نہیں۔',
          )}
          <span>© {new Date().getFullYear()} DiscoverSalah</span>
        </p>
      </footer>
      <nav className="mobile-bottom">
        <NavLink to="/" end>
          <Search size={20} />
          {t('Find', 'تلاش')}
        </NavLink>
        <NavLink to="/results">
          <CalendarDays size={20} />
          {t('Timings', 'اوقات')}
        </NavLink>
        <NavLink to="/coverage">
          <Map size={20} />
          {t('Coverage', 'دستیابی')}
        </NavLink>
        <NavLink to="/contribute">
          <HeartHandshake size={20} />
          {t('Help out', 'تعاون')}
        </NavLink>
      </nav>
    </>
  );
}
