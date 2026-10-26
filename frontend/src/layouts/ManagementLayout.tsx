import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  HeartHandshake,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/common/Brand';
import { LocaleButton } from '../components/common/LanguageSwitch';
import { ScreenContent } from '../components/ui/ScreenContent';
import { roleNames } from '../domain/constants';
import { useApp } from '../hooks/useApp';
import { tr } from '../i18n/translate';
import '../pages/management/guidance/sidebar-guide.css';

export function ManagementLayout() {
  const { role, actor, db, logout, t } = useApp();
  const [guide, setGuide] = useState(role === 'representative');
  const [open, setOpen] = useState(role === 'representative');
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!guide) setOpen(false);
  }, [loc.pathname, guide]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGuide(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const { account } = useApp();
  if (account?.mustChangePassword) return <Navigate to="/reset-password" replace />;
  if (!role)
    return <Navigate to={'/sign-in?next=' + encodeURIComponent(loc.pathname)} replace />;
  if (db.accounts.some((a) => a.id === actor && !a.active))
    return <Navigate to="/access-unavailable" replace />;
  const common = [
    ['/manage', 'Overview', LayoutDashboard, 'خلاصہ'],
    [
      '/manage/mosques',
      role === 'representative' ? 'My mosques' : 'Mosques & venues',
      Building2,
      'مساجد',
    ],
    ['/manage/submissions', 'Submissions', ClipboardList, 'درخواستیں'],
  ];
  const review =
    role !== 'representative'
      ? [
          ['/manage/reviews', 'Review queue', ShieldCheck, 'تصدیقی قطار'],
          ['/manage/registrations', 'Registration reviews', Building2, 'اندراج کے جائزے'],
          ['/manage/contact-changes', 'Contact reviews', ClipboardList, 'رابطے کے جائزے'],
          [
            '/manage/profile-changes',
            'Profile reviews',
            ClipboardList,
            'معلومات کے جائزے',
          ],
          ['/manage/maintenance', 'Maintenance & coverage', Map, 'دیکھ بھال اور دستیابی'],
          ['/manage/escalations', 'Urgent work', ShieldCheck, 'فوری کام'],
          ['/manage/representatives', 'Representatives', Users, 'نمائندے'],
        ]
      : [];
  const admin =
    role === 'admin'
      ? [
          ['/manage/areas', 'Cities & areas', Map, 'شہر اور علاقے'],
          ['/manage/accounts', 'Management accounts', Users, 'انتظامی اکاؤنٹس'],
          ['/manage/applications', 'Applications', HeartHandshake, 'رضاکار درخواستیں'],
          ['/manage/assignments', 'Assignments & cover', UserCircle, 'ذمہ داریاں'],
          ['/manage/duplicates', 'Duplicate listings', Building2, 'دہرے اندراجات'],
          ['/manage/delivery', 'Delivery failures', Mail, 'ترسیل کی ناکامیاں'],
        ]
      : [];
  const links = [
    ...common,
    ...review,
    ['/manage/reports', 'Issues & reports', MessageSquare, 'مسائل اور رپورٹس'],
    ...(role !== 'representative'
      ? [['/manage/suggestions', 'Mosque suggestions', MapPin, 'مسجد کی تجاویز']]
      : []),
    ['/manage/notices', 'Notice board', BookOpen, 'اعلانات'],
    ...admin,
    ['/manage/history', 'Activity history', History, 'سرگرمی کی تاریخ'],
    ['/manage/account', 'My account', Settings, 'میرا اکاؤنٹ'],
  ];
  const unread = db.notifications.filter((n) => n.role === role && !n.read).length;
  return (
    <div className={`management-layout ${guide ? 'mosque-guide-active' : ''}`}>
      {guide && <div className="mosque-guide-dim" aria-hidden="true" />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        <div className="workspace-label">
          {t(
            roleNames[role],
            role === 'representative'
              ? 'مقامی نمائندہ'
              : role === 'focal'
                ? 'فوکل پرسن'
                : 'منتظم',
          )}
        </div>
        {guide && (
          <section
            className="mosque-guide-note"
            aria-label={t('My mosques guide', 'میری مساجد کی رہنمائی')}
          >
            <strong>{t('Start here', 'یہاں سے شروع کریں')}</strong>
            <p>
              {t(
                'Click My mosques in the sidebar to open your assigned mosques.',
                'اپنی مقررہ مساجد کھولنے کے لیے سائیڈ بار میں میری مساجد پر کلک کریں۔',
              )}
            </p>
            <button type="button" className="secondary" onClick={() => setGuide(false)}>
              {t('Dismiss guide', 'رہنمائی بند کریں')}
            </button>
          </section>
        )}
        <nav aria-label={tr('Management navigation')}>
          {links.map(([url, en, Icon, ur]) => {
            const I = Icon as typeof Building2;
            return (
              <NavLink
                className={
                  guide && url === '/manage/mosques' ? 'mosque-guide-target' : undefined
                }
                onClick={() => setGuide(false)}
                key={url as string}
                to={url as string}
                end={url === '/manage'}
              >
                {guide && url === '/manage/mosques' && (
                  <span className="mosque-guide-arrow" aria-hidden="true">
                    ➜
                  </span>
                )}
                <I size={19} />
                <span>{t(en as string, ur as string)}</span>
                {url === '/manage/reviews' && db.counts?.pending !== undefined && (
                  <b>{db.counts?.pending}</b>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/">
            <ArrowUpRight size={18} />
            {t('View public website', 'عوامی ویب سائٹ')}
          </Link>
          <button
            onClick={async () => {
              await logout();
              navigate('/sign-in');
            }}
          >
            <LogOut size={18} />
            {t('Sign out', 'سائن آؤٹ')}
          </button>
          <small>{t('Connected management workspace', 'منسلک انتظامی ورک اسپیس')}</small>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label={tr('Close navigation')}
          onClick={() => setOpen(false)}
        />
      )}
      <div className="management-body">
        <header className="management-header">
          <div className="row">
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(!open)}
              aria-label={tr('Toggle navigation')}
            >
              <Menu />
            </button>
            <span className="muted">
              {t('Management workspace', 'انتظامی ورک اسپیس')}
            </span>
          </div>
          <div className="row">
            <LocaleButton />
            <Link
              to="/manage/notifications"
              className="notification-button"
              aria-label={tr('Notifications')}
            >
              <Bell size={21} />
              {(db.counts?.unread || 0) > 0 && <b>{db.counts?.unread}</b>}
            </Link>
            <span className="avatar">
              {db.accounts
                .find((a) => a.id === actor)
                ?.name.split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div className="account-caption">
              <strong>{db.accounts.find((a) => a.id === actor)?.name}</strong>
              <small>{tr(roleNames[role])}</small>
            </div>
          </div>
        </header>
        <main id="main-content" className="management-main">
          <ScreenContent />
        </main>
        <div className="workspace-foot">
          <ShieldCheck size={15} />
          {t(
            'Every change has a responsible person.',
            'ہر تبدیلی ایک ذمہ دار شخص سے منسلک ہے۔',
          )}
        </div>
      </div>
    </div>
  );
}
