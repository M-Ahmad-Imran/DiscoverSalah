import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';

export function Activity() {
  const { db, t, role, actor } = useApp();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [record, setRecord] = useState('');
  const [person, setPerson] = useState('');
  const venues = useScopedVenues();
  const rows = db.audit.filter(
    (a) =>
      (role === 'admin' || a.actor === actor || venues.some((v) => v.id === a.target)) &&
      (!params.get('venue') || a.target === params.get('venue')) &&
      (!from || a.at >= from) &&
      (!to || a.at.slice(0, 10) <= to) &&
      (!record || a.target === record) &&
      (!person || a.actor === person) &&
      `${a.action} ${a.actor}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title={t('Activity & audit history', 'سرگرمی اور آڈٹ کی تاریخ')}
        description={t(
          'A read-only record of accountable changes in your scope.',
          'آپ کے دائرے میں ذمہ دارانہ تبدیلیوں کا صرف پڑھنے والا ریکارڈ۔',
        )}
      />
      <input
        className="search-input"
        aria-label="Search audit"
        placeholder={t('Filter by action or actor…', 'عمل یا شخص سے فلٹر…')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Panel>
        <div className="two-grid">
          <Field label={t('From date', 'ابتدائی تاریخ')}>
            <input
              type="date"
              value={from}
              onInput={(e) => setFrom(e.currentTarget.value)}
            />
          </Field>
          <Field label={t('Through date', 'آخری تاریخ')}>
            <input
              type="date"
              value={to}
              min={from}
              onInput={(e) => setTo(e.currentTarget.value)}
            />
          </Field>
          <Field label={t('Record', 'ریکارڈ')}>
            <select value={record} onChange={(e) => setRecord(e.target.value)}>
              <option value="">All</option>
              {venues.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Actor', 'شخص')}>
            <select value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="">All</option>
              {db.accounts
                .filter(
                  (a) =>
                    role === 'admin' ||
                    a.id === actor ||
                    venues.some((v) => v.rep === a.id || v.focal === a.id),
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      </Panel>
      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('Action', 'عمل')}</th>
                <th>{t('Actor', 'شخص')}</th>
                <th>{t('Time', 'وقت')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.action}
                    <small>{a.target}</small>
                  </td>
                  <td>{a.actor}</td>
                  <td>{new Date(a.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title={t('No matching activity', 'کوئی متعلقہ سرگرمی نہیں')} />
        )}
      </Panel>
    </>
  );
}
