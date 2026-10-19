import { MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { AccessDenied } from '../../components/feedback/AccessDenied';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../hooks/useApp';

export function Areas() {
  const { db, role, update, t } = useApp();
  const [adding, setAdding] = useState(false);
  if (role !== 'admin') return <AccessDenied />;
  return (
    <>
      <PageTitle
        title={t('Cities & participating areas', 'شہر اور شریک علاقے')}
        action={
          <button onClick={() => setAdding(true)}>
            <Plus size={17} />
            {t('Add area', 'علاقہ شامل کریں')}
          </button>
        }
      />
      <Alert>
        {t(
          'Do not imply nationwide coverage. Assign a responsible reviewer before expanding participation.',
          'پورے ملک کی دستیابی کا تاثر نہ دیں۔ توسیع سے پہلے ذمہ دار نگران مقرر کریں۔',
        )}
      </Alert>
      <div className="three-grid spaced">
        {db.areas.map((a) => (
          <Panel key={a.name}>
            <MapPin className="green-text" />
            <h2>{a.name}</h2>
            <p>{a.city}</p>
            <Badge tone={a.focal ? 'green' : 'amber'}>
              {a.focal ? 'Reviewer assigned' : 'Responsibility gap'}
            </Badge>
            <p>
              {db.venues.filter((v) => v.area === a.name).length} {t('venues', 'مقامات')}
            </p>
            <ButtonLink
              secondary
              to={'/manage/assignments?area=' + encodeURIComponent(a.name)}
            >
              {t('Manage supervision', 'نگرانی کا انتظام')}
            </ButtonLink>
          </Panel>
        ))}
      </div>
      {adding && (
        <Modal
          title={t('Add participating area', 'شریک علاقہ شامل کریں')}
          onClose={() => setAdding(false)}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const x = Object.fromEntries(new FormData(e.currentTarget)) as Record<
                string,
                string
              >;
              if (db.areas.some((a) => a.name.toLowerCase() === x.name.toLowerCase()))
                return;
              update((d) => ({
                ...d,
                areas: [...d.areas, { name: x.name, city: x.city, focal: '' }],
              }));
              setAdding(false);
            }}
          >
            <Field label={t('Area name', 'علاقے کا نام')}>
              <input name="name" required />
            </Field>
            <Field label={t('City', 'شہر')}>
              <input name="city" defaultValue="Lahore" required />
            </Field>
            <button>
              {t('Add area with responsibility gap', 'نگران کے بغیر علاقہ شامل کریں')}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
