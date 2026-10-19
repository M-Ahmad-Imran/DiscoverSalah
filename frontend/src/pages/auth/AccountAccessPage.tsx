import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';

export function AuthSupport({
  mode,
}: {
  mode: 'recovery' | 'reset' | 'invite' | 'mfa' | 'expired' | 'denied';
}) {
  const { t, login, logout } = useApp();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const titles = {
    recovery: ['Recover your account', 'اکاؤنٹ بحال کریں'],
    reset: ['Choose a new password', 'نیا پاس ورڈ منتخب کریں'],
    invite: ['Accept your invitation', 'دعوت قبول کریں'],
    mfa: ['Administrator verification', 'منتظم کی تصدیق'],
    expired: ['Your session has expired', 'آپ کا سیشن ختم ہو گیا'],
    denied: ['Access unavailable', 'رسائی دستیاب نہیں'],
  };
  return (
    <div className="container narrow auth-support">
      <PageTitle title={t(...(titles[mode] as [string, string]))} />
      <Panel>
        {mode === 'expired' || mode === 'denied' ? (
          <>
            <Alert tone="warning">
              {t(
                mode === 'denied'
                  ? 'Your current assignment does not allow access to this workspace.'
                  : 'Sign in again to continue. Your previous session is no longer valid.',
                mode === 'denied'
                  ? 'آپ کی موجودہ ذمہ داری اس ورک اسپیس تک رسائی نہیں دیتی۔'
                  : 'جاری رکھنے کے لیے دوبارہ سائن ان کریں۔',
              )}
            </Alert>
            <ButtonLink
              to={
                '/sign-in?next=' +
                encodeURIComponent(
                  params.get('next')?.startsWith('/manage')
                    ? params.get('next')!
                    : '/manage',
                )
              }
            >
              {t('Return to sign in', 'سائن ان پر واپس')}
            </ButtonLink>
          </>
        ) : done ? (
          <>
            <Alert>
              {t(
                mode === 'recovery'
                  ? 'If an eligible account exists, recovery instructions would be sent to its verified contact number. Phone verification and recovery delivery is not connected in this preview.'
                  : 'The sample flow is complete. Return to sign in. No real credentials were changed.',
                mode === 'recovery'
                  ? 'اہل اکاؤنٹ ہو تو تصدیق شدہ رابطہ نمبر پر ہدایات بھیجی جائیں گی۔ پیش نظارے میں نمبر کی تصدیق اور ترسیل منسلک نہیں۔'
                  : 'نمونہ عمل مکمل ہو گیا۔ کوئی حقیقی پاس ورڈ تبدیل نہیں ہوا۔',
              )}
            </Alert>
            <ButtonLink to="/sign-in">
              {t('Back to sign in', 'سائن ان پر واپس')}
            </ButtonLink>
          </>
        ) : (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              if (mode === 'mfa') {
                if (form.get('code') !== '123456') {
                  setError(
                    t('Use the sample code 123456.', 'نمونہ کوڈ 123456 استعمال کریں۔'),
                  );
                  return;
                }
                login('admin');
                navigate('/manage');
                return;
              }
              if (mode === 'reset' || mode === 'invite') {
                if (params.get('token') !== 'demo-valid') {
                  setError(
                    t(
                      'Invitation or reset token is expired, invalid, or missing. Ask your administrator for a new invitation or request recovery.',
                      'دعوت یا ٹوکن غلط یا ختم ہو گیا ہے۔ نئی دعوت یا بحالی کی درخواست دیں۔',
                    ),
                  );
                  return;
                }
                if (form.get('password') !== form.get('confirm')) {
                  setError(t('Passwords do not match.', 'پاس ورڈ یکساں نہیں۔'));
                  return;
                }
                logout();
              }
              setDone(true);
            }}
          >
            {mode === 'mfa' ? (
              <>
                <Alert>
                  {t(
                    'Sample Admin flow. Enter 123456 to explore. Production MFA must be verified by the backend.',
                    'نمونہ منتظم عمل۔ دیکھنے کے لیے 123456 درج کریں۔ حقیقی MFA سرور سے تصدیق ہوگا۔',
                  )}
                </Alert>
                <Link className="text-link" to="/recovery">
                  {t(
                    'Lost access to your second factor? Request independent recovery.',
                    'دوسری تصدیق دستیاب نہیں؟ آزاد بحالی کی درخواست دیں۔',
                  )}
                </Link>
                <Field label={t('Six-digit code', 'چھ ہندسوں کا کوڈ')}>
                  <input
                    name="code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                  />
                </Field>
              </>
            ) : mode === 'recovery' ? (
              <>
                <p>
                  {t(
                    'We use the verified contact number on your management account. Production recovery uses expiring, single-use tokens.',
                    'اکاؤنٹ کی تصدیق شدہ رابطہ نمبر استعمال ہوگی۔ محدود مدت کا ٹوکن ایک بار استعمال ہو سکتا ہے۔',
                  )}
                </p>
                <Field label={t('Verified contact number', 'تصدیق شدہ رابطہ نمبر')}>
                  <input
                    name="contactNumber"
                    type="tel"
                    inputMode="tel"
                    required
                    autoComplete="tel"
                  />
                </Field>
              </>
            ) : (
              <>
                {mode === 'invite' && (
                  <Alert>
                    {t(
                      'Assigned scope: sample Local Representative · Gulberg III. An invitation never allows you to choose a higher role.',
                      'نمونہ ذمہ داری: مقامی نمائندہ · گلبرگ III۔ دعوت سے آپ خود اعلیٰ کردار نہیں چن سکتے۔',
                    )}
                  </Alert>
                )}
                <Field label={t('New password', 'نیا پاس ورڈ')}>
                  <input
                    type="password"
                    name="password"
                    minLength={12}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <Field label={t('Confirm password', 'پاس ورڈ کی تصدیق')}>
                  <input
                    type="password"
                    name="confirm"
                    minLength={12}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <small>
                  {t(
                    'At least 12 characters. Demo token for testing: demo-valid.',
                    'کم از کم ۱۲ حروف۔ آزمائشی ٹوکن: demo-valid۔',
                  )}
                </small>
              </>
            )}
            {error && <Alert tone="warning">{error}</Alert>}
            <button>
              {t(
                mode === 'mfa'
                  ? 'Verify and continue'
                  : mode === 'recovery'
                    ? 'Request recovery'
                    : 'Continue',
                mode === 'mfa'
                  ? 'تصدیق کر کے آگے بڑھیں'
                  : mode === 'recovery'
                    ? 'بحالی کی درخواست'
                    : 'آگے بڑھیں',
              )}
            </button>
            <Link to="/sign-in" className="text-link">
              {t('Back to sign in', 'سائن ان پر واپس')}
            </Link>
          </form>
        )}
      </Panel>
    </div>
  );
}
