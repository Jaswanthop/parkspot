import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../lib/api.js';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || '/';

  if (loading) return null;
  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const signedIn = await login(email.trim(), password);
      toast(`Welcome back, ${signedIn.name.split(' ')[0]}.`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setEmail('demo@parkspot.dev');
    setPassword('Demo@12345');
    setError('');
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to ParkSpot"
      subtitle="Pick up your reservations, or book a new bay in seconds."
      message={location.state?.message}
      footer={
        <>
          New to ParkSpot? <Link to="/register">Create a free account</Link>
        </>
      }
    >
      <div className="demo-hint">
        <div>
          <strong>Just exploring?</strong>
          <span>
            Demo driver: <code>demo@parkspot.dev</code> / <code>Demo@12345</code>
          </span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={fillDemo}>
          Use demo
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <div className="input-with-action">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((show) => !show)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? <Spinner size={17} /> : null}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-small">
        Admin? Use the credentials configured for your deployment. The seeded admin is{' '}
        <code>admin@parkspot.dev</code>.
      </p>
    </AuthShell>
  );
}
