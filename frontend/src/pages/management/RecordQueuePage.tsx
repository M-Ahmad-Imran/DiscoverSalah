import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardIcon } from '../../components/common/ClipboardIcon';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { canAccessRequest } from '../../domain/permissions';
import { useApp } from '../../hooks/useApp';

export function RecordQueue({ kind }: { kind: string }) {
  const { db, t, role, actor } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [grouped, setGrouped] = useState(false);
  if (['application'].includes(kind) && role !== 'admin') return <AccessDenied />;
  if (
    ['registration', 'contact-change', 'suggestion', 'profile-change'].includes(kind) &&
    role === 'representative'
  )
    return <AccessDenied />;
  const titles: Record<string, [string, string]> = {
    report: ['Issues & public reports', 'مسائل اور عوامی رپورٹس'],
    suggestion: ['Missing-mosque suggestions', 'غیر موجود مساجد کی تجاویز'],
    application: ['Contributor applications', 'رضاکاروں کی درخواستیں'],
    registration: ['Registration reviews', 'اندراجات کے جائزے'],
    'contact-change': ['Contact change reviews', 'رابطے کی تبدیلیوں کا جائزہ'],
    'profile-change': ['Identity & profile reviews', 'شناخت اور معلومات کا جائزہ'],
  };
  const rows = db.requests.filter(
    (r) =>
      r.kind === kind &&
      canAccessRequest(db, role, actor, r) &&
      (filter === 'All' || r.status === filter) &&
      `${r.id} ${r.title}`.toLowerCase().includes(q.toLowerCase()),
  );
  if (grouped)
    rows.sort(
      (a, b) =>
        (a.values.venue || a.values.area || '').localeCompare(
          b.values.venue || b.values.area || '',
        ) || (a.values.type || '').localeCompare(b.values.type || ''),
    );
  return (
    <>
      <PageTitle
        title={t(...(titles[kind] || titles.report))}
        description={t(
          'Review evidence, record a decision and preserve a clear history.',
          'شواہد دیکھیں، فیصلہ درج کریں اور واضح تاریخ برقرار رکھیں۔',
        )}
      />
      <div className="results-toolbar">
        <input
          aria-label="Search requests"
          placeholder={t('Search requests…', 'درخواستیں تلاش کریں…')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Filter requests"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            'All',
            ...new Set(db.requests.filter((r) => r.kind === kind).map((r) => r.status)),
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {kind === 'report' && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
          />
          {t(
            'Group related reports by mosque and issue type',
            'متعلقہ رپورٹس مسجد اور مسئلے کے مطابق جمع کریں',
          )}
        </label>
      )}
      <Panel>
        {rows.map((r) => (
          <Link className="venue-list-row" key={r.id} to={'/manage/requests/' + r.id}>
            <span className="icon-tile">
              <ClipboardIcon />
            </span>
            <div>
              <strong>{r.title}</strong>
              <small>
                {r.id} · {new Date(r.created).toLocaleDateString()} ·{' '}
                {r.values.type || r.values.issue} ·{' '}
                {db.venues.find((v) => v.id === r.values.venue)?.name || r.values.area}
              </small>
            </div>
            <Badge
              tone={
                r.status === 'Resolved' || r.status === 'Approved' ? 'green' : 'amber'
              }
            >
              {r.status}
            </Badge>
            <ArrowRight size={17} />
          </Link>
        ))}
        {!rows.length && (
          <Empty
            title={t('No matching requests', 'کوئی متعلقہ درخواست نہیں')}
            description={t(
              'Requests submitted through the public forms will appear here.',
              'عوامی فارم سے موصول درخواستیں یہاں آئیں گی۔',
            )}
          />
        )}
      </Panel>
    </>
  );
}
