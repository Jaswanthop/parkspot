import { Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>
            Parking that respects your time. Compare live bays, reserve in seconds,
            and arrive knowing your space is waiting.
          </p>
        </div>
        <div className="footer-links">
          <div>
            <h4>Explore</h4>
            <Link to="/">Find a bay</Link>
            <Link to="/reservations">My bookings</Link>
            <Link to="/register">Create account</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/login">Sign in</Link>
            <Link to="/admin">Admin console</Link>
            <a href="#book">Live availability</a>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} ParkSpot. Demo project.</span>
        <span className="footer-stack">React · Node.js · Express · MongoDB</span>
      </div>
    </footer>
  );
}
