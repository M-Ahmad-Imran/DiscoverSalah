import { Check, Info } from 'lucide-react';
import { type ReactNode } from 'react';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';

export function Badge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: string;
}) {
  useApp();
  return (
    <span className={`badge ${tone}`}>
      {tone === 'green' ? <Check size={13} /> : <Info size={13} />}{' '}
      {typeof children === 'string' ? tr(children) : children}
    </span>
  );
}
