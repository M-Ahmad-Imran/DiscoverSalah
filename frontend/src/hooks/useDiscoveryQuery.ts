import { useSearchParams } from 'react-router-dom';
import { today } from '../utils/date';

export function useQuery() {
  const [params, setParams] = useSearchParams();
  const query = {
    prayer: params.get('prayer') || 'Asr',
    date: params.get('date') || today(),
    scope: params.get('scope') || 'nearby',
    mode: params.get('mode') || 'walking',
    origin: params.get('origin') || '',
    sort: params.get('sort') || 'time',
    radius: params.get('radius') || '5',
    area: params.get('area') || '',
  };
  const change = (key: string, value: string) =>
    setParams(
      (p) => {
        p.set(key, value);
        return p;
      },
      {
        replace: true,
      },
    );
  return { params, query, change, suffix: '?' + params.toString() };
}
