import { Check, Info } from 'lucide-react';
import { type ReactNode } from 'react';

export function Badge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      {tone === 'green' ? <Check size={13} /> : <Info size={13} />} {children}
    </span>
  );
}
