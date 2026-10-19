import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function ButtonLink({
  to,
  children,
  secondary = false,
  className = '',
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link className={`button ${secondary ? 'secondary' : ''} ${className}`} to={to}>
      {children}
    </Link>
  );
}
