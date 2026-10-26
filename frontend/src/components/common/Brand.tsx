import { Link } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { tr } from '../../i18n/translate';

export function Brand() {
  useApp();
  return (
    <Link to="/" className="brand" aria-label={tr('DiscoverSalah home')}>
      <span className="brand-mark">
        <img src="/assets/logo.png" alt={tr('')} />
      </span>
      <span>
        Discover<span className="brand-light">Salah</span>
        <small>{tr('FIND YOUR CONGREGATION')}</small>
      </span>
    </Link>
  );
}
