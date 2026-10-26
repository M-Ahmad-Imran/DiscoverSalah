import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Edit3,
  ExternalLink,
  History,
  Phone,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Timetable } from '../../components/management/Timetable';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Modal } from '../../components/ui/Modal';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { canManage } from '../../domain/permissions';
import { resolveTimes } from '../../domain/schedules';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';
import { today } from '../../utils/date';

export function VenueOverview() {
  const { id } = useParams();
  const { db, role, actor, mutate, t, toast } = useApp();
  const v = db.venues.find((v) => v.id === id);
  const [confirm, setConfirm] = useState(false);
  if (!v || !role || !canManage(role, v, actor)) return <AccessDenied />;
  const registration = db.requests.find(
    (r) => r.kind === 'registration' && r.values.venue === id,
  );
  const pending = db.proposals.find((p) => p.venueId === id && p.state === 'Submitted');
  return (
    <>
      <div className="breadcrumb">
        <Link to="/manage/mosques">{t('My mosques', 'میری مساجد')}</Link>
        <ChevronRight size={14} />
        {v.name}
      </div>
      <PageTitle
        eyebrow={v.area}
        title={t(v.name, v.urdu)}
        description={v.address}
        action={
          <ButtonLink secondary to={'/mosque/' + id}>
            {t('View public page', 'عوامی صفحہ')}
            <ExternalLink size={16} />
          </ButtonLink>
        }
      />
      {registration?.status === 'Returned' &&
        (v.rep === actor || registration.values.author === actor) && (
          <Alert tone="warning">
            <p>{registration.internalNotes}</p>
            <ButtonLink to={`/manage/registrations/${id}/edit`}>
              {t('Correct and resubmit registration', 'اندراج درست کر کے دوبارہ بھیجیں')}
            </ButtonLink>
          </Alert>
        )}
      {pending && (
        <div className="action-card">
          <span className="icon-tile amber">
            <ClipboardList />
          </span>
          <div>
            <h3>{t('Pending schedule proposal', 'اوقات کی تجویز زیر التوا')}</h3>
            <p>
              {pending.id} ·{' '}
              {t(
                'Current approved times stay separate from this proposal.',
                'موجودہ منظور شدہ اوقات تجویز سے الگ ہیں۔',
              )}
            </p>
          </div>
          <ButtonLink to={'/manage/submissions/' + pending.id}>
            {t('View proposal', 'تجویز دیکھیں')}
          </ButtonLink>
        </div>
      )}
      <div className="detail-grid spaced">
        <div className="stack">
          <Panel
            title={t('Current approved timetable', 'موجودہ منظور شدہ اوقات')}
            action={
              <Link className="text-link" to={`/manage/mosques/${id}/edit`}>
                <Edit3 size={16} />
                {t('Edit timetable', 'اوقات میں ترمیم')}
              </Link>
            }
          >
            <Timetable times={resolveTimes(v, db.proposals, today())} />
            <button className="secondary full spaced" onClick={() => setConfirm(true)}>
              <CheckCircle2 size={18} />
              {t('Confirm timings unchanged', 'اوقات نہ بدلنے کی تصدیق')}
            </button>
          </Panel>
          <Panel
            title={t('Special congregations & exceptions', 'خصوصی جماعتیں اور استثنا')}
          >
            <p>
              {t(
                'Manage Friday sessions, dated overrides, provisional Eid dates and explicit cancellations.',
                'جمعہ، تاریخ وار تبدیلیوں، عارضی عید اور منسوخی کا انتظام کریں۔',
              )}
            </p>
            <ButtonLink secondary to={`/manage/mosques/${id}/edit?tab=special`}>
              {t('Manage sessions', 'جماعتوں کا انتظام')}
              <ArrowRight size={16} />
            </ButtonLink>
          </Panel>
          <Panel
            title={t('Mosque profile & facilities', 'مسجد کی معلومات اور سہولیات')}
            action={
              <Link className="text-link" to={`/manage/mosques/${id}/profile`}>
                {t('Edit information', 'معلومات بدلیں')}
              </Link>
            }
          >
            <p>{v.address}</p>
            <div className="row wrap">
              {Object.entries(v.facilities).map(([key, val]) => (
                <Badge key={key} tone="neutral">
                  {tr(key)}: {tr(val)}
                </Badge>
              ))}
            </div>
          </Panel>
          <Panel
            title={t('Mosque notice board', 'مسجد کے اعلانات')}
            action={
              <Link className="text-link" to={'/manage/notices/new?venue=' + id}>
                <Plus size={16} />
                {t('Create notice', 'اعلان بنائیں')}
              </Link>
            }
          >
            <p>
              {t(
                'Notices require review before public display and cannot change the official timetable.',
                'اعلانات اشاعت سے پہلے جائزے کے لیے جاتے ہیں اور اوقات تبدیل نہیں کر سکتے۔',
              )}
            </p>
            <ButtonLink secondary to="/manage/notices">
              {t('Manage notices', 'اعلانات کا انتظام')}
            </ButtonLink>
          </Panel>
        </div>
        <aside className="stack">
          <Panel title={t('Verification record', 'تصدیق کا ریکارڈ')}>
            <ShieldCheck size={30} className="green-text" />
            <dl className="definition-list">
              <dt>{t('Last Focal phone verification', 'آخری فوکل فون تصدیق')}</dt>
              <dd>{v.phoneVerified}</dd>
              <dt>{t('Representative reconfirmation', 'نمائندے کی دوبارہ تصدیق')}</dt>
              <dd>{v.reconfirmed}</dd>
              <dt>{t('Current revision', 'موجودہ ورژن')}</dt>
              <dd>v{v.revision}</dd>
            </dl>
          </Panel>
          <Panel title={t('Private Imam contact', 'امام کا نجی رابطہ')}>
            <Alert>
              {t(
                'Private contact details are visible only to authorized management.',
                'نجی رابطے کی معلومات صرف مجاز انتظامیہ دیکھ سکتی ہے۔',
              )}
            </Alert>
            <p>
              <strong>{v.contactName || t('Registered Imam', 'رجسٹرڈ امام')}</strong>
              <br />
              <a href={v.contactNumber ? 'tel:' + v.contactNumber : undefined}>
                {v.contactNumber}
              </a>
              <br />
              {t('Private · authorized management only', 'نجی · صرف مجاز انتظامیہ')}
            </p>
            <ButtonLink secondary to={`/manage/mosques/${id}/contact`}>
              <Phone size={16} />
              {t('Request contact change', 'رابطے کی تبدیلی')}
            </ButtonLink>
          </Panel>
          <Panel title={t('Governance & assignment', 'انتظام اور ذمہ داری')}>
            <p>
              {t('Representative', 'نمائندہ')}:{' '}
              {db.accounts.find((a) => a.id === v.rep)?.name || 'Unassigned'}
            </p>
            <p>
              {t('Focal Person', 'فوکل پرسن')}:{' '}
              {db.accounts.find((a) => a.id === v.focal)?.name || 'Unassigned'}
            </p>
            <ButtonLink secondary to={'/manage/history?venue=' + id}>
              <History size={16} />
              {t('Activity history', 'سرگرمی کی تاریخ')}
            </ButtonLink>
          </Panel>
        </aside>
      </div>
      {confirm && (
        <Modal
          title={t('Confirm unchanged timings', 'اوقات نہ بدلنے کی تصدیق')}
          onClose={() => setConfirm(false)}
        >
          <p>
            {t(
              'This records your reconfirmation of the displayed daily timetable. It does not create a new Imam phone verification or clear pending changes.',
              'یہ موجودہ روزانہ اوقات کی آپ کی تصدیق ہے۔ یہ نئی فون تصدیق نہیں اور زیر التوا تبدیلیاں ختم نہیں کرتی۔',
            )}
          </p>
          <Timetable times={resolveTimes(v, db.proposals, today())} />
          <button
            className="full spaced"
            onClick={async () => {
              try {
                await mutate('/management/venues/' + id + '/reconfirm', {
                  revision: v.revision,
                  reason: 'Displayed daily timetable reconfirmed unchanged',
                });
                setConfirm(false);
                toast(
                  t(
                    'Representative reconfirmation recorded',
                    'نمائندے کی دوبارہ تصدیق درج ہو گئی',
                  ),
                );
              } catch {
                return;
              }
            }}
          >
            {t('Confirm unchanged', 'کوئی تبدیلی نہیں')}
          </button>
        </Modal>
      )}
    </>
  );
}
