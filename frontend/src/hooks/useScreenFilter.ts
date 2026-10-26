import { useSearchParams } from 'react-router-dom';
export function useScreenFilter(
  key: string,
  initial = '',
): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  return [
    params.get(key) || initial,
    (value) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value && value !== 'All') next.set(key, value);
          else next.delete(key);
          next.delete('cursor');
          return next;
        },
        { replace: true },
      ),
  ];
}
