import { TrustNote } from '../../components/discovery/TrustNote';
import { ButtonLink } from '../../components/ui/ButtonLink';
import { PageTitle } from '../../components/ui/PageTitle';
import { Panel } from '../../components/ui/Panel';
import { content } from '../../data/information';
import { useApp } from '../../hooks/useApp';

export function Information({ page }: { page: string }) {
  const { t } = useApp();
  const c = content[page] || content.help;
  return (
    <div className="container narrow">
      <PageTitle
        eyebrow="DISCOVERSALAH"
        title={t(...c.title)}
        description={t(...c.intro)}
      />
      <div className="stack">
        {c.sections.map(([en, ur, body, bodyUr]) => (
          <Panel key={en} title={t(en, ur)}>
            <p>{t(body, bodyUr)}</p>
          </Panel>
        ))}
        <TrustNote />
        <div className="row">
          <ButtonLink to="/">{t('Find a mosque', 'مسجد تلاش کریں')}</ButtonLink>
          <ButtonLink secondary to="/contact">
            {t('Contact support', 'مدد کے لیے رابطہ')}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
