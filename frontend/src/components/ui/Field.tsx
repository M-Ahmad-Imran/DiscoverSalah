import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useApp } from '../../hooks/useApp';
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const { t } = useApp();
  const id = useId();
  const child = isValidElement(children)
    ? (children as ReactElement<{ id?: string; 'aria-describedby'?: string }>)
    : null;
  const controlId = child?.props.id || id;
  return (
    <div className="field">
      <label htmlFor={controlId}>{t(label)}</label>
      {child
        ? cloneElement(child, {
            id: controlId,
            ...(hint ? { 'aria-describedby': controlId + '-hint' } : {}),
          })
        : children}
      {hint && <small id={controlId + '-hint'}>{hint}</small>}
    </div>
  );
}
