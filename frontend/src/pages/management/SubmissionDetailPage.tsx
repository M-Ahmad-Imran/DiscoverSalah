import { ArrowRight, Edit3 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Timetable } from '../../components/management/Timetable';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { canViewVenue } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';
import { displayDate, tr } from '../../i18n/translate';
import { today } from '../../utils/date';

export function SubmissionDetail() {
  const { id } = useParams();
  const { db, t, role, actor, setDraft } = useApp();
  const navigate = useNavigate();
  const p = db.proposals.find((p) => p.id === id);
  const v = db.venues.find((v) => v.id === p?.venueId);
  if (!p || !v || !role || !canViewVenue(role, v, actor)) return <AccessDenied />;
  const revise = () => {
    setDraft({
      venueId: v.id,
      times: { ...p.times },
      special: p.special.map((session) => ({ ...session })),
      effective: p.effective < today() ? today() : p.effective,
      reason: p.reason,
      baseRevision: v.revision,
    });
    navigate('/manage/mosques/' + v.id + '/edit');
  };
  return (
    <>
      <PageTitle
        eyebrow={`${v.name} · ${p.id} · v${p.version}`}
        title={t('Timing submission details', 'اوقات کی درخواست کی تفصیلات')}
        action={
          <Badge tone={p.state === 'Approved' ? 'green' : 'amber'}>{p.state}</Badge>
        }
      />
      <Alert>
        {t(
          p.state === 'Approved'
            ? p.effective > today()
              ? 'Approved for future activation. The previous schedule remains effective until the date below.'
              : 'This approved version is effective according to its schedule window.'
            : p.state === 'Submitted'
              ? 'Awaiting independent verification. This submission is not published.'
              : p.state === 'Superseded'
                ? 'A newer version replaced this proposal. This historical version is read-only.'
                : 'This version is retained in history. Corrections create a new proposal.',
          p.state === 'Approved'
            ? 'منظور شدہ ورژن اپنی مقررہ تاریخ پر لاگو ہوگا۔'
            : p.state === 'Submitted'
              ? 'آزاد تصدیق کا انتظار ہے۔ یہ درخواست شائع نہیں ہوئی۔'
              : 'یہ ورژن تاریخ میں محفوظ ہے۔ اصلاح نیا ورژن بنائے گی۔',
        )}
      </Alert>
      <div className="detail-grid spaced">
        <div className="stack">
          <Panel title={t('Changes in this proposal', 'اس تجویز کی تبدیلیاں')}>
            <Timetable times={p.times} before={p.before} />
          </Panel>
          <Panel title={t('Effective schedule & rationale', 'لاگو اوقات اور وجہ')}>
            <p>{p.reason}</p>
            <Badge tone="neutral">
              {p.effective}
              {tr('· Asia/Karachi')}
            </Badge>
            {p.decision && <Alert>{p.decision}</Alert>}
          </Panel>
          <Panel title={t('Version lineage', 'ورژن کی تاریخ')}>
            {db.proposals
              .filter((x) => x.venueId === v.id)
              .map((x) => (
                <Link to={'/manage/submissions/' + x.id} className="list-row" key={x.id}>
                  <strong>
                    v{x.version} · {x.id}
                  </strong>
                  <Badge tone="neutral">{tr(x.state)}</Badge>
                </Link>
              ))}
          </Panel>
        </div>
        <aside className="stack">
          <Panel title={t('Submission record', 'درخواست کا ریکارڈ')}>
            <dl className="definition-list">
              <dt>{t('Submitted by', 'جمع کرانے والا')}</dt>
              <dd>{db.accounts.find((a) => a.id === p.author)?.name || p.author}</dd>
              <dt>{t('Submitted at', 'جمع کرنے کا وقت')}</dt>
              <dd>{displayDate(p.created, true)}</dd>
              <dt>{t('Focal Person', 'فوکل پرسن')}</dt>
              <dd>{db.accounts.find((a) => a.id === v.focal)?.name}</dd>
            </dl>
            {p.state !== 'Superseded' && role === 'representative' && (
              <button onClick={revise}>
                <Edit3 size={16} />
                {t('Revise as new proposal', 'نئی تجویز کے طور پر ترمیم')}
              </button>
            )}
            {role !== 'representative' && p.state === 'Submitted' && (
              <ButtonLink to={'/manage/review/' + p.id}>
                {t('Open verification', 'تصدیق کھولیں')}
                <ArrowRight size={17} />
              </ButtonLink>
            )}
          </Panel>
          <Panel title={t('Activity history', 'سرگرمی کی تاریخ')}>
            <ButtonLink secondary to={'/manage/history?venue=' + v.id}>
              {t('View all', 'سب دیکھیں')}
            </ButtonLink>
            <div className="timeline">
              {db.audit.slice(0, 5).map((a) => (
                <div key={a.id}>
                  <span className="timeline-dot" />
                  <strong>{tr(a.action)}</strong>
                  <small>{displayDate(a.at, true)}</small>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
