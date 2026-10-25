import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { initials } from '../lib/format.js';
import { LogOut, Menu, Close, Ticket, Shield, Search } from './Icons.jsx';
import { Logo } from './Logo.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    toast('You are signed out.');
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Logo />

        <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <Search size={16} />
            Find parking
          </NavLink>
          <NavLink
            to="/reservations"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <Ticket size={16} />
            My bookings
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Shield size={16} />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <Link to="/reservations" className="user-chip" title={user.email}>
                <span className="avatar">{initials(user.name)}</span>
                <span className="user-meta">
                  <strong>{user.name.split(' ')[0]}</strong>
                  <small>{user.role === 'admin' ? 'Administrator' : 'Driver'}</small>
                </span>
              </Link>
              <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Create account
              </Link>
            </>
          )}
          <button
            type="button"
            className="icon-btn menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <Close size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
