import { useSearchParams } from 'react-router-dom';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { RecordSelect } from '../../components/ui/RecordSelect';
import { useApp } from '../../hooks/useApp';
import { useScopedVenues } from '../../hooks/useScopedVenues';
import { useScreenFilter } from '../../hooks/useScreenFilter';
import { displayDate, tr } from '../../i18n/translate';

export function Activity() {
  const { db, t, role, actor } = useApp();
  const [params] = useSearchParams();
  const [q, setQ] = useScreenFilter('q', '');
  const [from, setFrom] = useScreenFilter('from', '');
  const [to, setTo] = useScreenFilter('to', '');
  const [record, setRecord] = useScreenFilter('venue', '');
  const [person, setPerson] = useScreenFilter('person', '');
  const venues = useScopedVenues();
  const rows = db.audit;
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
        aria-label={tr('Search audit')}
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
            <RecordSelect
              resource="venues"
              value={record}
              onChange={(e) => setRecord(e.target.value)}
            >
              <option value="">{tr('All')}</option>
              {venues.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </RecordSelect>
          </Field>
          <Field label={t('Actor', 'شخص')}>
            <RecordSelect
              resource="accounts"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            >
              <option value="">{tr('All')}</option>
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
            </RecordSelect>
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
                    {tr(a.action)}
                    <small>{a.target}</small>
                  </td>
                  <td>{a.actor}</td>
                  <td>{displayDate(a.at, true)}</td>
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
