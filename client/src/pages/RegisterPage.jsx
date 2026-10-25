import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../lib/api.js';

export function RegisterPage() {
  const { user, loading, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      toast(`Welcome to ParkSpot, ${created.name.split(' ')[0]}.`);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Reserve bays, keep your booking history and cancel free before you arrive."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Full name</span>
            <input
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Alex Morgan"
              autoComplete="name"
              minLength={2}
              required
            />
          </label>
          <label className="field">
            <span>Phone (optional)</span>
            <input
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              placeholder="+1 555 0100"
              autoComplete="tel"
            />
          </label>
        </div>

        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <div className="form-row">
          <label className="field">
            <span>Password</span>
            <div className="input-with-action">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                placeholder="8+ chars, letter & number"
                autoComplete="new-password"
                minLength={8}
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

          <label className="field">
            <span>Confirm password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirm}
              onChange={(event) => update('confirm', event.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? <Spinner size={17} /> : null}
          {submitting ? 'Creating account…' : 'Create free account'}
        </button>

        <p className="auth-small">
          By creating an account you agree that this is a demo application and
          reservations carry no real-world obligation.
        </p>
      </form>
    </AuthShell>
  );
}
