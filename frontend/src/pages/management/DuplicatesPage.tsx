import { useState } from 'react';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';
import { uid } from '../../utils/id';

export function Duplicates() {
  const { db, role, t, toast, update, actor } = useApp();
  const [first, setFirst] = useState(db.venues[0]?.id);
  const [second, setSecond] = useState(db.venues[1]?.id);
  const [reason, setReason] = useState('');
  if (role !== 'admin') return <AccessDenied />;
  return (
    <>
      <PageTitle
        title={t('Duplicate listing assessment', 'دہرے اندراج کا جائزہ')}
        description={t(
          'Compare records without destructive automatic merging.',
          'خودکار حذف کے بغیر ریکارڈ کا موازنہ کریں۔',
        )}
      />
      <div className="two-grid">
        {[first, second].map((id, i) => {
          const v = db.venues.find((v) => v.id === id)!;
          return (
            <Panel key={i}>
              <Field
                label={t(
                  i ? 'Compare listing' : 'Primary listing',
                  i ? 'موازنہ اندراج' : 'مرکزی اندراج',
                )}
              >
                <select
                  value={id}
                  onChange={(e) =>
                    i ? setSecond(e.target.value) : setFirst(e.target.value)
                  }
                >
                  {db.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <h2>{v.name}</h2>
              <p>{v.address}</p>
              <Badge>{v.status}</Badge>
              <p>
                {v.lat}, {v.lng}
              </p>
              <ButtonLink secondary to={'/manage/mosques/' + id}>
                {t('Inspect record', 'ریکارڈ دیکھیں')}
              </ButtonLink>
            </Panel>
          );
        })}
      </div>
      <Panel className="spaced">
        <Field label={t('Assessment and evidence', 'جائزہ اور شواہد')}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </Field>
        <button
          disabled={first === second || !reason.trim()}
          onClick={() => {
            update((d) => ({
              ...d,
              venues: d.venues.map((v) =>
                v.id === second ? { ...v, duplicateOf: first } : v,
              ),
              requests: d.requests.map((r) =>
                ['suggestion', 'report'].includes(r.kind) && r.values.venue === second
                  ? {
                      ...r,
                      values: { ...r.values, linkedVenue: first },
                      response: 'Duplicate assessment linked to ' + first,
                    }
                  : r,
              ),
              audit: [
                {
                  id: uid('A'),
                  action: `Duplicate assessment; primary ${first}, duplicate ${second}: ${reason}`,
                  actor,
                  at: new Date().toISOString(),
                  target: first,
                },
                ...d.audit,
              ],
            }));
            toast(
              t(
                'Assessment recorded. Neither listing was deleted or merged.',
                'جائزہ درج ہو گیا۔ کوئی اندراج حذف یا ضم نہیں ہوا۔',
              ),
            );
            setReason('');
          }}
        >
          {t('Record assessment', 'جائزہ درج کریں')}
        </button>
      </Panel>
    </>
  );
}
