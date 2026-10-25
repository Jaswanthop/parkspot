import { Link } from 'react-router-dom';
import { ParkingSign } from './Icons.jsx';

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="logo" aria-label="ParkSpot home">
      <span className="logo-mark">
        <ParkingSign size={20} />
      </span>
      {!compact && (
        <span className="logo-text">
          Park<span>Spot</span>
        </span>
      )}
    </Link>
  );
}
