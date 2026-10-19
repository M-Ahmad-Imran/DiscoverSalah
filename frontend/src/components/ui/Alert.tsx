import { Info } from 'lucide-react';
import { type ReactNode } from 'react';

export function Alert({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`alert ${tone}`}>
      <Info size={19} />
      <div>{children}</div>
    </div>
  );
}
