import { useNavigate } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { Role } from '../../types/index';
import { uid } from '../../utils/id';

export function InvitationForm() {
  const { db, role, update, actor, t, toast } = useApp();
  const navigate = useNavigate();
  if (role === 'representative') return <AccessDenied />;
  return (
    <>
      <PageTitle title={t('Invite a management account', 'انتظامی اکاؤنٹ کو دعوت')} />
      <Panel>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<
              string,
              string
            >;
            update((d) => ({
              ...d,
              accounts: [
                ...d.accounts,
                {
                  id: uid('account'),
                  name: x.name,
                  contactNumber: x.contactNumber.trim(),
                  role: x.role as Role,
                  area: x.area,
                  active: false,
                  status: 'Invited',
                },
              ],
              audit: [
                {
                  id: uid('A'),
                  action: 'Invitation prepared for ' + x.name,
                  actor,
                  at: new Date().toISOString(),
                  target: x.name,
                },
                ...d.audit,
              ],
            }));
            toast(
              t(
                'Sample invitation prepared. No message has been sent.',
                'نمونہ دعوت تیار۔ کوئی پیغام نہیں بھیجا گیا۔',
              ),
            );
            navigate('/manage/accounts');
          }}
        >
          <Field label={t('Full name', 'پورا نام')}>
            <input name="name" required />
          </Field>
          <Field label={t('Verified contact number', 'تصدیق شدہ رابطہ نمبر')}>
            <input
              name="contactNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </Field>
          <Field label={t('Approved role', 'منظور شدہ کردار')}>
            <select name="role">
              {role === 'admin' && <option value="focal">Focal Person</option>}
              <option value="representative">Local Representative</option>
            </select>
          </Field>
          <Field label={t('Assigned area', 'مقررہ علاقہ')}>
            <select name="area">
              {db.areas
                .filter((a) => role === 'admin' || a.focal === actor)
                .map((a) => (
                  <option key={a.name}>{a.name}</option>
                ))}
            </select>
          </Field>
          <label className="checkbox">
            <input type="checkbox" required />
            {t(
              'Contact ownership and independent reference checks are complete.',
              'رابطے کی ملکیت اور آزاد حوالہ چیک ہو گیا۔',
            )}
          </label>
          <Alert>
            {t(
              'This creates an inactive invitation record. Production invitations require a single-use token delivered through a verified contact number.',
              'یہ غیر فعال دعوت بنائے گا۔ اصل دعوت کے لیے تصدیق شدہ رابطہ نمبر پر یک وقتی ٹوکن ضروری ہے۔',
            )}
          </Alert>
          <button>{t('Prepare invitation', 'دعوت تیار کریں')}</button>
        </form>
      </Panel>
    </>
  );
}
