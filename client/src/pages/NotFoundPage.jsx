import { Link } from 'react-router-dom';
import { ParkingSign } from '../components/Icons.jsx';

export function NotFoundPage() {
  return (
    <section className="notfound container">
      <div className="notfound-mark">
        <ParkingSign size={44} />
      </div>
      <span className="eyebrow">404 · Wrong turn</span>
      <h1>That bay doesn’t exist.</h1>
      <p>
        The page you’re looking for has moved, or the link was mistyped. Let’s get
        you back to the lot.
      </p>
      <div className="hero-cta">
        <Link to="/" className="btn btn-primary">
          Back to parking
        </Link>
        <Link to="/reservations" className="btn btn-ghost">
          My bookings
        </Link>
      </div>
    </section>
  );
}
