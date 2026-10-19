import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { Empty } from '../../components/ui/Empty';
import { Field } from '../../components/ui/Field';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { noticeState } from '../../domain/notices';
import { useApp } from '../../hooks/useApp';
import { useNow } from '../../hooks/useNow';
import { useScopedVenues } from '../../hooks/useScopedVenues';
import { uid } from '../../utils/id';

export function Notices() {
  const { db, role, actor, update, t, toast } = useApp();
  const venues = useScopedVenues();
  const now = useNow();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('All');
  const list = db.notices.filter(
    (n) =>
      venues.some((v) => v.id === n.venueId) &&
      (filter === 'All' || noticeState(n, now) === filter),
  );
  return (
    <>
      <PageTitle
        title={t('Mosque notice board', 'مسجد کے اعلانات')}
        description={t(
          'Relevant, reviewed and time-limited community information.',
          'متعلقہ، تصدیق شدہ اور محدود مدت کی اجتماعی معلومات۔',
        )}
        action={
          <ButtonLink to="/manage/notices/new">
            <Plus size={18} />
            {t('Create notice', 'اعلان بنائیں')}
          </ButtonLink>
        }
      />
      <div className="tabs">
        {[
          'All',
          'Draft',
          'Returned',
          'Rejected',
          'Submitted',
          'Published',
          'Expired',
          'Canceled',
        ].map((x) => (
          <button
            key={x}
            className={filter === x ? 'active' : ''}
            onClick={() => setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="two-grid">
        {list.map((n) => (
          <Panel key={n.id}>
            <Badge tone={n.state === 'Published' ? 'green' : 'amber'}>
              {noticeState(n, now)}
            </Badge>
            <h2>{n.title}</h2>
            <p>{n.body}</p>
            <small>
              {db.venues.find((v) => v.id === n.venueId)?.name} · {n.category}
            </small>
            <dl className="definition-list">
              <dt>{t('Event / expires', 'تقریب / اختتام')}</dt>
              <dd>
                {n.event} / {n.expires}
              </dd>
            </dl>
            <details>
              <summary>{t('Private source evidence', 'نجی ماخذ کے شواہد')}</summary>
              <p>{n.source || t('No evidence recorded', 'شواہد درج نہیں')}</p>
            </details>
            {role !== 'representative' &&
              n.author !== actor &&
              n.state === 'Submitted' && (
                <>
                  <Field label={t('Moderation reason', 'جائزے کی وجہ')}>
                    <textarea
                      value={reasons[n.id] || ''}
                      onChange={(e) => setReasons({ ...reasons, [n.id]: e.target.value })}
                    />
                  </Field>
                  <div className="row wrap">
                    {['Returned', 'Rejected'].map((decision) => (
                      <button
                        className="secondary"
                        key={decision}
                        disabled={(reasons[n.id] || '').trim().length < 5}
                        onClick={() => {
                          if (!window.confirm(decision + '?')) return;
                          update((d) => ({
                            ...d,
                            notices: d.notices.map((x) =>
                              x.id === n.id ? { ...x, state: decision } : x,
                            ),
                            audit: [
                              {
                                id: uid('A'),
                                action:
                                  'Notice ' +
                                  decision +
                                  ' · ' +
                                  n.id +
                                  ' · ' +
                                  reasons[n.id],
                                actor,
                                at: new Date().toISOString(),
                                target: n.venueId,
                              },
                              ...d.audit,
                            ],
                          }));
                        }}
                      >
                        {decision}
                      </button>
                    ))}
                  </div>
                </>
              )}
            <div className="row wrap">
              <ButtonLink secondary to={'/manage/notices/' + n.id + '/edit'}>
                {t('Revise notice', 'اعلان میں ترمیم')}
              </ButtonLink>
              {role !== 'representative' &&
                n.author !== actor &&
                n.state === 'Submitted' && (
                  <button
                    onClick={() => {
                      if (
                        !n.source.trim() ||
                        Date.parse(n.expires + '+05:00') <= Date.now()
                      ) {
                        toast(
                          t(
                            'Source evidence and a future expiry are required.',
                            'ماخذ کے شواہد اور آئندہ اختتامی وقت درکار ہیں۔',
                          ),
                        );
                        return;
                      }
                      if (
                        window.confirm(
                          t(
                            'Confirm source authority, privacy, event details and expiry before approving this notice.',
                            'منظوری سے پہلے ماخذ، رازداری، تقریب اور اختتام کی تصدیق کریں۔',
                          ),
                        )
                      )
                        update((d) => ({
                          ...d,
                          notices: d.notices.map((x) =>
                            x.id === n.id
                              ? { ...x, state: 'Published' }
                              : x.id === n.replacesId
                                ? { ...x, state: 'Superseded' }
                                : x,
                          ),
                        }));
                    }}
                  >
                    {t('Approve notice', 'اعلان منظور کریں')}
                  </button>
                )}
              {n.state !== 'Canceled' && (
                <button
                  className="secondary danger-text"
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          'Cancel this notice and remove it from public display?',
                          'اعلان منسوخ کر کے عوامی صفحے سے ہٹائیں؟',
                        ),
                      )
                    )
                      update((d) => ({
                        ...d,
                        notices: d.notices.map((x) =>
                          x.id === n.id ? { ...x, state: 'Canceled' } : x,
                        ),
                      }));
                  }}
                >
                  {t('Cancel notice', 'اعلان منسوخ')}
                </button>
              )}
            </div>
          </Panel>
        ))}
      </div>
      {!list.length && (
        <Empty title={t('No notices in this view', 'اس فہرست میں کوئی اعلان نہیں')} />
      )}
    </>
  );
}
