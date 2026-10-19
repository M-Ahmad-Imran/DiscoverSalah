import { type ReactNode } from 'react';

export function Panel({
  title,
  children,
  action,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="section-title">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
