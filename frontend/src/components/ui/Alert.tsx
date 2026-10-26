import { Info } from 'lucide-react';
import { type ReactNode } from 'react';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';

export function Alert({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: string;
}) {
  useApp();
  return (
    <div className={`alert ${tone}`}>
      <Info size={19} />
      <div>{typeof children === 'string' ? tr(children) : children}</div>
    </div>
  );
}
