import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, errorMessage } from '../lib/api.js';
import {
  addHours,
  combineDateTime,
  defaultStart,
  formatDate,
  formatMoney,
  formatTime,
  toDateInput,
  toTimeInput,
  zoneLabel,
} from '../lib/format.js';
import { BookingModal } from '../components/BookingModal.jsx';
import { SlotCard, SlotSkeleton } from '../components/SlotCard.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import {
  ArrowRight,
  Bolt,
  Calendar,
  Check,
  Clock,
  MapPin,
  Shield,
  Sparkles,
  Ticket,
} from '../components/Icons.jsx';

const FIRST_START = defaultStart();

const TIME_OPTIONS = (() => {
  const options = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    options.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 22) options.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return options;
})();

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const TYPES = [
  { value: 'all', label: 'All bays' },
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike' },
  { value: 'ev', label: 'EV' },
];

function prettyTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [dateStr, setDateStr] = useState(() => toDateInput(FIRST_START));
  const [timeStr, setTimeStr] = useState(() => toTimeInput(FIRST_START));
  const [duration, setDuration] = useState(2);
  const [type, setType] = useState('all');

  const [slots, setSlots] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedSlot, setSelectedSlot] = useState(null);

  const start = useMemo(() => combineDateTime(dateStr, timeStr), [dateStr, timeStr]);
  const end = useMemo(() => addHours(start, duration), [start, duration]);

  const todayStr = toDateInput(new Date());
  const maxDateStr = toDateInput(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
  const startInPast = start.getTime() < Date.now();
  const liveBoard = slots.slice(0, 6);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSlots() {
      setLoadingSlots(true);
      setSlotsError('');
      try {
        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
        });
        if (type !== 'all') params.set('type', type);
        const data = await api(`/slots?${params.toString()}`, {
          auth: false,
          signal: controller.signal,
        });
        setSlots(data.slots);
        setMeta(data.meta);
        setLastUpdated(new Date());
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSlots([]);
          setMeta(null);
          setSlotsError(errorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => controller.abort();
  }, [start, end, type, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    api('/slots/stats', { auth: false })
      .then((data) => {
        if (!cancelled) setStats(data.stats);
      })
      .catch(() => {
        /* The stats strip is decorative; slot search errors are shown separately. */
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleReserve(slot) {
    if (!user) {
      toast('Sign in to reserve a bay.', 'info');
      navigate('/login', {
        state: { from: '/', message: 'Sign in to reserve your parking bay.' },
      });
      return;
    }
    if (startInPast) {
      toast('Pick a start time in the future first.', 'error');
      return;
    }
    setSelectedSlot(slot);
  }

  function handleBooked() {
    setRefreshKey((key) => key + 1);
  }

  const availableCount = meta?.available ?? 0;

  return (
    <>
      <section className="hero">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="pulse-dot" /> Live bay availability · 24/7 access
            </span>
            <h1>
              Your spot is waiting.
              <br />
              <span className="text-gradient">Skip the circling.</span>
            </h1>
            <p className="hero-lead">
              Reserve a guaranteed parking bay before you leave. Compare live
              availability across every level, pick your window, and roll straight in.
            </p>
            <div className="hero-cta">
              <a href="#book" className="btn btn-primary btn-lg">
                Find a bay <ArrowRight size={18} />
              </a>
              <Link
                to={user ? '/reservations' : '/register'}
                className="btn btn-ghost btn-lg"
              >
                {user ? 'My bookings' : 'Create free account'}
              </Link>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>{stats?.totalSlots ?? '—'}</dt>
                <dd>Managed bays</dd>
              </div>
              <div>
                <dt className="text-mint">{stats?.availableNow ?? '—'}</dt>
                <dd>Free right now</dd>
              </div>
              <div>
                <dt>{stats ? formatMoney(stats.priceFrom) : '—'}</dt>
                <dd>From, per hour</dd>
              </div>
            </dl>
          </div>

          <div className="hero-board-wrap">
            <div className="live-board">
              <div className="live-board-head">
                <div className="live-title">
                  <span className="pulse-dot" />
                  Live lot board
                </div>
                <span className="live-levels">
                  {stats?.levels?.length ?? 3} levels · {stats?.totalSlots ?? 24} bays
                </span>
              </div>

              <div className="live-board-rows">
                {(loadingSlots && slots.length === 0 ? Array.from({ length: 6 }) : liveBoard).map(
                  (slot, index) =>
                    slot ? (
                      <div className="live-row" key={slot.id}>
                        <span className={`live-dot ${slot.available ? 'open' : 'busy'}`} />
                        <span className="live-code">{slot.code}</span>
                        <span className="live-zone">{zoneLabel(slot.zone)}</span>
                        <span className="live-price">
                          {formatMoney(slot.pricePerHour)}
                          <small>/hr</small>
                        </span>
                        <span className={`live-tag ${slot.available ? 'open' : 'busy'}`}>
                          {slot.available ? 'Open' : 'Taken'}
                        </span>
                      </div>
                    ) : (
                      <div className="live-row live-row-skeleton" key={`skeleton-${index}`}>
                        <span className="skeleton skeleton-dot" />
                        <span className="skeleton skeleton-line w-20" />
                        <span className="skeleton skeleton-line w-40" />
                        <span className="skeleton skeleton-line w-20" />
                      </div>
                    ),
                )}
              </div>

              <div className="live-board-foot">
                <span>
                  {lastUpdated
                    ? `Updated ${formatTime(lastUpdated)} · ${availableCount} free in your window`
                    : 'Checking the lot…'}
                </span>
                <span className="badge-soft">Live</span>
              </div>
            </div>

            <div className="floating-note">
              <span className="floating-icon">
                <Shield size={17} />
              </span>
              <div>
                <strong>Guaranteed on arrival</strong>
                <span>Free cancellation before your start time</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="booking-section container" id="book">
        <div className="section-head">
          <div>
            <span className="eyebrow">Step 1 · Pick a window</span>
            <h2>Reserve in under a minute</h2>
          </div>
          <p>
            Prices are per hour. Every reservation is held exclusively for your
            vehicle — no sharing, no surprises.
          </p>
        </div>

        <div className="booking-panel">
          <div className="booking-controls">
            <label className="field">
              <span>
                <Calendar size={13} /> Date
              </span>
              <input
                type="date"
                value={dateStr}
                min={todayStr}
                max={maxDateStr}
                onChange={(event) => setDateStr(event.target.value)}
              />
            </label>

            <label className="field">
              <span>
                <Clock size={13} /> Start time
              </span>
              <select value={timeStr} onChange={(event) => setTimeStr(event.target.value)}>
                {TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {prettyTime(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>
                <Clock size={13} /> Duration
              </span>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                {DURATIONS.map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} {hours === 1 ? 'hour' : 'hours'}
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span>
                <MapPin size={13} /> Vehicle
              </span>
              <div className="segmented" role="group" aria-label="Vehicle type">
                {TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={type === item.value ? 'segmented-item active' : 'segmented-item'}
                    onClick={() => setType(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="availability-summary">
            <span className={`summary-dot ${availableCount > 0 ? 'open' : 'busy'}`} />
            <div>
              <strong>
                {loadingSlots
                  ? 'Checking availability…'
                  : `${availableCount} of ${meta?.total ?? 0} bays free`}
              </strong>
              <span>
                {formatDate(start)} · {formatTime(start)} – {formatTime(end)}
              </span>
            </div>
          </div>
        </div>

        {startInPast && (
          <div className="alert alert-warn">
            That start time has already passed. Choose a later time to continue.
          </div>
        )}
        {slotsError && (
          <div className="alert alert-error">
            <span>{slotsError}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              Retry
            </button>
          </div>
        )}

        <div className="slots-head">
          <div>
            <span className="eyebrow">Step 2 · Choose a bay</span>
            <h2>{type === 'all' ? 'Available bays' : `${TYPES.find((item) => item.value === type)?.label} bays`}</h2>
          </div>
          <span className="badge-soft">
            {loadingSlots ? 'Refreshing…' : `${availableCount} available`}
          </span>
        </div>

        {loadingSlots && slots.length === 0 ? (
          <div className="slot-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <SlotSkeleton key={index} />
            ))}
          </div>
        ) : slots.length === 0 && !slotsError ? (
          <EmptyState
            icon={<Ticket size={26} />}
            title="No bays for this filter"
            description="Try a different vehicle type or adjust your time window."
            action={
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setType('all')}
              >
                Show all bays
              </button>
            }
          />
        ) : (
          <div className="slot-grid">
            {slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onReserve={handleReserve}
                disabled={startInPast}
              />
            ))}
          </div>
        )}

        <p className="slot-footnote">
          Availability refreshes with every search. Prices shown include the full
          reservation window at checkout.
        </p>
      </section>

      <section className="features-section container">
        <div className="feature-card">
          <span className="feature-icon">
            <Bolt size={20} />
          </span>
          <h3>Real-time inventory</h3>
          <p>
            Every query checks active reservations, so a bay marked “Available” is
            actually free for your exact window.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <Shield size={20} />
          </span>
          <h3>Your bay is held</h3>
          <p>
            Reservations lock the bay to your plate and window. Arrive to a space
            that hasn’t been taken.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <Sparkles size={20} />
          </span>
          <h3>EV, bike and accessible</h3>
          <p>
            Filter by vehicle type and find the right bay — chargers, wide bays and
            step-free access included.
          </p>
        </div>
      </section>

      <section className="how-section container">
        <div className="section-head">
          <div>
            <span className="eyebrow">How it works</span>
            <h2>From search to parked in three steps</h2>
          </div>
        </div>
        <ol className="steps">
          <li>
            <span className="step-number">01</span>
            <h3>Pick your window</h3>
            <p>Choose a date, start time and duration. Availability updates instantly.</p>
          </li>
          <li>
            <span className="step-number">02</span>
            <h3>Reserve your bay</h3>
            <p>Add your plate and confirm. We lock the bay and issue a reference.</p>
          </li>
          <li>
            <span className="step-number">03</span>
            <h3>Arrive and park</h3>
            <p>Drive in at your start time. Your booking is in your account if you need it.</p>
          </li>
        </ol>
      </section>

      <section className="container cta-band">
        <div>
          <span className="eyebrow">
            <Check size={13} /> No subscription required
          </span>
          <h2>Never circle the block again.</h2>
          <p>Create an account, reserve a bay and cancel free before your start time.</p>
        </div>
        <div className="cta-actions">
          <a href="#book" className="btn btn-primary btn-lg">
            Reserve a bay <ArrowRight size={18} />
          </a>
          <Link to="/register" className="btn btn-ghost btn-lg">
            Create account
          </Link>
        </div>
      </section>

      <BookingModal
        slot={selectedSlot}
        start={start}
        end={end}
        open={Boolean(selectedSlot)}
        onClose={() => setSelectedSlot(null)}
        onBooked={handleBooked}
      />
    </>
  );
}
