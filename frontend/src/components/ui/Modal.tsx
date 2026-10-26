import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="section-title">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label={tr('Close')}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
