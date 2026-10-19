import { Link } from 'react-router-dom';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="DiscoverSalah home">
      <span className="brand-mark">
        <img src="/assets/logo.png" alt="" />
      </span>
      <span>
        Discover<span className="brand-light">Salah</span>
        <small>FIND YOUR CONGREGATION</small>
      </span>
    </Link>
  );
}
