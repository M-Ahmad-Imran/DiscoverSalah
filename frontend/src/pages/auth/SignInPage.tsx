import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TrustNote } from '../../components/discovery/TrustNote';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { Role } from '../../types/index';

export function SignIn() {
  const { login, t } = useApp();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const enter = (role: Role) => {
    if (role === 'admin') {
      navigate('/mfa');
      return;
    }
    login(role);
    const next = params.get('next');
    navigate(next?.startsWith('/manage') ? next : '/manage');
  };
  return (
    <div className="container auth-layout">
      <section className="auth-story">
        <div className="icon-tile">
          <ShieldCheck size={30} />
        </div>
        <p className="eyebrow">
          {t('A TRUSTED COMMUNITY EFFORT', 'ایک قابل اعتماد اجتماعی کاوش')}
        </p>
        <h1>
          {t('Small updates.', 'چھوٹی تبدیلیاں۔')}
          <br />
          {t('A meaningful difference.', 'ایک اہم فرق۔')}
        </h1>
        <p>
          {t(
            'Help your community find accurate Jama’at times. Your care keeps every listing useful and every change accountable.',
            'اپنی کمیونٹی کو جماعت کے درست اوقات فراہم کریں۔ آپ کی توجہ ہر تبدیلی کو ذمہ دار بناتی ہے۔',
          )}
        </p>
        <TrustNote />
        <Link to="/contribute" className="text-link">
          {t('Want to help? Become a contributor', 'تعاون کرنا چاہتے ہیں؟ رضاکار بنیں')}
          <ArrowRight size={17} />
        </Link>
      </section>
      <Panel className="auth-card">
        <div className="icon-tile">
          <LockKeyhole />
        </div>
        <h2>{t('Welcome back', 'خوش آمدید')}</h2>
        <p>
          {t(
            'Sign in to manage your assigned mosques.',
            'اپنی مقررہ مساجد کا انتظام کرنے کے لیے سائن ان کریں۔',
          )}
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setError(
              t(
                'Live authentication is not connected. Use a sample workspace below to explore the frontend.',
                'حقیقی تصدیق منسلک نہیں۔ نیچے نمونہ ورک اسپیس استعمال کریں۔',
              ),
            );
          }}
        >
          <Field label={t('Verified contact number', 'تصدیق شدہ رابطہ نمبر')}>
            <input
              type="tel"
              inputMode="tel"
              name="contactNumber"
              required
              placeholder="+92 3XX XXXXXXX"
              autoComplete="username"
            />
          </Field>
          <Field label={t('Password', 'پاس ورڈ')}>
            <span className="password-input">
              <input
                type={show ? 'text' : 'password'}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </Field>
          <Link to="/recovery" className="text-link">
            {t('Forgot password?', 'پاس ورڈ بھول گئے؟')}
          </Link>
          {error && <Alert tone="warning">{error}</Alert>}
          <button type="submit">
            {t('Sign in', 'سائن ان')}
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="or-divider">
          {t('EXPLORE SAMPLE WORKSPACES', 'نمونہ ورک اسپیس دیکھیں')}
        </div>
        <div className="demo-logins">
          <button className="secondary" onClick={() => enter('representative')}>
            <Building2 size={18} />
            {t('Representative preview', 'نمائندے کا پیش نظارہ')}
          </button>
          <button className="secondary" onClick={() => enter('focal')}>
            <Users size={18} />
            {t('Focal Person preview', 'فوکل پرسن کا پیش نظارہ')}
          </button>
          <button className="secondary" onClick={() => enter('admin')}>
            <ShieldCheck size={18} />
            {t('Admin preview', 'منتظم کا پیش نظارہ')}
          </button>
        </div>
        <small className="muted">
          {t(
            'Preview sessions are not secure authentication. All data is fictional and stored on this device.',
            'پیش نظارے کا سیشن حقیقی تصدیق نہیں۔ تمام ڈیٹا فرضی اور اس ڈیوائس پر ہے۔',
          )}
        </small>
      </Panel>
    </div>
  );
}
