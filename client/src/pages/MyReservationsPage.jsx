import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';
import {
  Bike,
  Bolt,
  Calendar,
  Car,
  Clock,
  MapPin,
  Ticket,
  Trash,
} from '../components/Icons.jsx';
import { Modal } from '../components/Modal.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusPill } from '../components/StatusPill.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api, errorMessage } from '../lib/api.js';
import {
  formatDate,
  formatMoney,
  formatTime,
  isPast,
  typeLabel,
} from '../lib/format.js';

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_ICONS = { car: Car, bike: Bike, ev: Bolt };

export function MyReservationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api('/reservations/mine', { signal: controller.signal })
      .then((data) => setReservations(data.reservations))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey]);

  const counts = useMemo(() => {
    const now = Date.now();
    return reservations.reduce(
      (acc, reservation) => {
        if (reservation.status === 'cancelled') acc.cancelled += 1;
        else if (new Date(reservation.endTime).getTime() < now) acc.past += 1;
        else acc.upcoming += 1;
        return acc;
      },
      { upcoming: 0, past: 0, cancelled: 0 },
    );
  }, [reservations]);

  const visible = useMemo(() => {
    const now = Date.now();
    const list = [...reservations];
    if (tab === 'upcoming') {
      return list
        .filter(
          (reservation) =>
            reservation.status === 'active' && new Date(reservation.endTime).getTime() >= now,
        )
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }
    if (tab === 'past') {
      return list
        .filter(
          (reservation) =>
            reservation.status === 'active' && new Date(reservation.endTime).getTime() < now,
        )
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }
    return list
      .filter((reservation) => reservation.status === 'cancelled')
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [reservations, tab]);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const data = await api(`/reservations/${cancelTarget.id}/cancel`, { method: 'PATCH' });
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === data.reservation.id ? data.reservation : reservation,
        ),
      );
      toast('Reservation cancelled. The bay is free for someone else.');
      setCancelTarget(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <section className="page-hero page-hero-compact">
        <div className="container page-head">
          <div>
            <span className="eyebrow">
              <Ticket size={13} /> {user?.name?.split(' ')[0]}’s bookings
            </span>
            <h1>My reservations</h1>
            <p>Keep track of every bay you’ve reserved and cancel free before it starts.</p>
          </div>
          <Link to="/#book" className="btn btn-primary">
            New booking
          </Link>
        </div>
      </section>

      <section className="container reservations-section">
        <div className="tabs" role="tablist" aria-label="Reservation filters">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              className={tab === item.value ? 'tab active' : 'tab'}
              onClick={() => setTab(item.value)}
            >
              {item.label}
              <span className="tab-count">{counts[item.value]}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="ticket-list">
            {Array.from({ length: 2 }).map((_, index) => (
              <div className="ticket-card skeleton-card" key={index}>
                <div className="skeleton skeleton-line w-30" />
                <div className="skeleton skeleton-block short" />
                <div className="skeleton skeleton-line w-80" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Ticket size={26} />}
            title={
              tab === 'upcoming'
                ? 'No upcoming bookings'
                : tab === 'past'
                  ? 'No past bookings yet'
                  : 'Nothing cancelled'
            }
            description={
              tab === 'upcoming'
                ? 'Find a free bay and lock it in — it only takes a minute.'
                : tab === 'past'
                  ? 'Once a reservation ends it will appear here as history.'
                  : 'Cancelled reservations will show up here.'
            }
            action={
              tab === 'upcoming' ? (
                <Link to="/#book" className="btn btn-primary">
                  Find a bay
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="ticket-list">
            {visible.map((reservation) => {
              const Icon = TYPE_ICONS[reservation.vehicleType] || Car;
              const cancellable =
                reservation.status === 'active' && !isPast(reservation.startTime);
              return (
                <article className={`ticket-card ticket-${reservation.status}`} key={reservation.id}>
                  <span className={`ticket-stripe ${reservation.status}`} />

                  <div className="ticket-main">
                    <div className="ticket-head">
                      <div>
                        <span className="mono reference">{reservation.reference}</span>
                        <h3>
                          {reservation.slot?.code}
                          <span className="ticket-level">
                            <MapPin size={13} /> {reservation.slot?.level}
                          </span>
                        </h3>
                      </div>
                      <StatusPill status={reservation.status} />
                    </div>

                    <dl className="ticket-details">
                      <div>
                        <dt>
                          <Calendar size={14} /> Date
                        </dt>
                        <dd>{formatDate(reservation.startTime)}</dd>
                      </div>
                      <div>
                        <dt>
                          <Clock size={14} /> Time
                        </dt>
                        <dd>
                          {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <Icon size={14} /> Vehicle
                        </dt>
                        <dd>
                          {reservation.vehiclePlate}
                          <span className="ticket-type"> · {typeLabel(reservation.vehicleType)}</span>
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <Ticket size={14} /> Total
                        </dt>
                        <dd>{formatMoney(reservation.totalPrice)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="ticket-side">
                    <span>Total charged</span>
                    <strong>{formatMoney(reservation.totalPrice)}</strong>
                    {cancellable ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setCancelTarget(reservation)}
                      >
                        <Trash size={15} /> Cancel booking
                      </button>
                    ) : (
                      <small>
                        {reservation.status === 'cancelled'
                          ? 'Cancelled'
                          : reservation.status === 'active'
                            ? 'In progress or completed'
                            : 'Completed'}
                      </small>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => (cancelling ? null : setCancelTarget(null))}
        title="Cancel this reservation?"
        subtitle="The bay will be released immediately."
        width={480}
      >
        {cancelTarget && (
          <>
            <div className="booking-slot-banner">
              <span className="bay-icon">
                <MapPin size={20} />
              </span>
              <div>
                <strong>
                  {cancelTarget.slot?.code} · {cancelTarget.slot?.level}
                </strong>
                <span>
                  {formatDate(cancelTarget.startTime)} · {formatTime(cancelTarget.startTime)} –{' '}
                  {formatTime(cancelTarget.endTime)}
                </span>
              </div>
            </div>
            <p className="modal-copy">
              You can rebook the same bay later if it is still free. Cancelling is
              free until the reservation start time.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                Keep booking
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? <Spinner size={16} /> : <Trash size={16} />}
                {cancelling ? 'Cancelling…' : 'Cancel reservation'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
