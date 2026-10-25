import { Link } from 'react-router-dom';
import { Check } from '../components/Icons.jsx';
import { Logo } from '../components/Logo.jsx';

export function AuthShell({ eyebrow, title, subtitle, message, children, footer }) {
  return (
    <section className="auth-page">
      <div className="container auth-container">
        <div className="auth-card">
          <aside className="auth-aside">
            <Logo />
            <div className="auth-aside-copy">
              <span className="eyebrow">ParkSpot member</span>
              <h2>Parking without the guesswork.</h2>
              <p>
                One account for every bay, vehicle and trip. Reserve ahead, cancel
                free, and keep a clean history of where you parked.
              </p>
              <ul className="auth-points">
                <li>
                  <Check size={15} /> Live availability across every level
                </li>
                <li>
                  <Check size={15} /> Free cancellation before your start time
                </li>
                <li>
                  <Check size={15} /> Car, bike, EV and accessible bays
                </li>
              </ul>
            </div>
            <div className="auth-aside-foot">
              <strong>24 bays · 3 levels · 24/7 access</strong>
              <span>Reserve in under a minute.</span>
            </div>
          </aside>

          <div className="auth-form-wrap">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>

            {message && <div className="alert alert-info">{message}</div>}
            {children}

            <p className="auth-footer">{footer}</p>
          </div>
        </div>

        <p className="auth-back">
          <Link to="/">← Back to parking</Link>
        </p>
      </div>
    </section>
  );
}
