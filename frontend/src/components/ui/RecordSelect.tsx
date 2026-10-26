import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type SelectHTMLAttributes,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { api } from '../../services/api';
import type { Database } from '../../types';

type Resource = 'venues' | 'areas' | 'accounts';
/** Searchable bounded selector; selections hydrate just the records needed by the form. */
export function RecordSelect({
  resource,
  nameValue = false,
  roleFilter,
  kindFilter,
  areaFilter,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  resource: Resource;
  nameValue?: boolean;
  roleFilter?: string;
  kindFilter?: string;
  areaFilter?: string;
}) {
  const { include, t, locale } = useApp();
  const location = useLocation();
  const [text, setText] = useState(''),
    [query, setQuery] = useState(''),
    [cursor, setCursor] = useState('');
  const [data, setData] = useState<Database | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const merge = useRef(include);
  merge.current = include;
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(text);
      setCursor('');
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const q = new URLSearchParams({ view: resource, q: query, limit: '20' });
    if (cursor) q.set('cursor', cursor);
    if (roleFilter) q.set('role', roleFilter);
    if (kindFilter) q.set('kind', kindFilter);
    if (areaFilter) q.set('area', areaFilter);
    const base = location.pathname.startsWith('/manage')
      ? '/management/workspace?'
      : '/catalog?';
    void api<Database>(base + q)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError('');
        merge.current({ [resource]: result[resource] });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [resource, query, cursor, roleFilter, kindFilter, areaFilter, location.pathname]);
  const rows = (data?.[resource] || []).filter((row) =>
    data?.page?.ids.includes(row.id || ''),
  );
  const [choice, setChoice] = useState(String(props.defaultValue ?? ''));
  const selected = String(props.value ?? choice);
  const savedOption = useRef<{ value: string; label: string } | null>(null);
  const currentRow = rows.find((row) => (nameValue ? row.name : row.id) === selected);
  if (currentRow)
    savedOption.current = {
      value: selected,
      label:
        locale === 'ur' && 'urdu' in currentRow
          ? String(currentRow.urdu)
          : currentRow.name,
    };
  useEffect(() => {
    if (!selected || rows.some((row) => (nameValue ? row.name : row.id) === selected))
      return;
    let active = true;
    const params = new URLSearchParams({ view: resource, q: selected, limit: '1' });
    const base = location.pathname.startsWith('/manage')
      ? '/management/workspace?'
      : '/catalog?';
    void api<Database>(base + params)
      .then((result) => {
        if (!active) return;
        const row = result[resource].find(
          (row) => (nameValue ? row.name : row.id) === selected,
        );
        if (row) {
          savedOption.current = { value: selected, label: row.name };
          merge.current({ [resource]: [row] });
        }
      })
      .catch(() => {
        /* The normal search remains available if a saved choice was removed. */
      });
    return () => {
      active = false;
    };
  }, [selected, resource, nameValue, location.pathname]);
  const values = new Set(rows.map((row) => (nameValue ? row.name : row.id)));
  const retained = Children.toArray(children).filter((child) => {
    if (!isValidElement<{ value?: string; children?: unknown }>(child)) return false;
    const value = String(child.props.value ?? child.props.children ?? '');
    return value === '' || (value === selected && !values.has(value));
  });
  return (
    <div className="stack">
      {!props.disabled && (
        <input
          type="search"
          aria-label={t('Search available records', 'دستیاب ریکارڈ تلاش کریں')}
          placeholder={t('Search by name…', 'نام سے تلاش کریں…')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}
      <select
        {...props}
        value={selected}
        defaultValue={undefined}
        onChange={(event) => {
          setChoice(event.target.value);
          savedOption.current = {
            value: event.target.value,
            label: event.target.selectedOptions[0]?.text || event.target.value,
          };
          props.onChange?.(event);
        }}
      >
        {data ? (
          <>
            {retained}
            {savedOption.current?.value === selected &&
              selected &&
              !values.has(selected) &&
              !retained.some(
                (child) =>
                  isValidElement<{ value?: string }>(child) &&
                  child.props.value === selected,
              ) && <option value={selected}>{savedOption.current.label}</option>}
            {rows.map((row) => (
              <option key={row.id} value={nameValue ? row.name : row.id}>
                {locale === 'ur' && 'urdu' in row ? row.urdu : row.name}
              </option>
            ))}
          </>
        ) : (
          children
        )}
      </select>
      {error && <span role="alert">{error}</span>}
      {!props.disabled && (
        <div className="row wrap">
          {loading && <small role="status">{t('Loading…', 'لوڈ ہو رہا ہے…')}</small>}
          {cursor && (
            <button type="button" className="secondary" onClick={() => setCursor('')}>
              {t('First page', 'پہلا صفحہ')}
            </button>
          )}
          {data?.page?.nextCursor && (
            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() => setCursor(data.page!.nextCursor!)}
            >
              {t('More options', 'مزید اختیارات')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
