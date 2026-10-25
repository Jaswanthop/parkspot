import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import { formatDate, formatMoney, formatTime, typeLabel } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { Check, Clock, MapPin } from './Icons.jsx';
import { Modal } from './Modal.jsx';
import { Spinner } from './Spinner.jsx';

export function BookingModal({ slot, start, end, open, onClose, onBooked }) {
  const { toast } = useToast();
  const [plate, setPlate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    if (open) {
      setPlate('');
      setError('');
      setSubmitting(false);
      setConfirmation(null);
    }
  }, [open, slot?.id]);

  if (!slot) return null;

  const hours = (end - start) / (60 * 60 * 1000);
  const total = slot.pricePerHour * hours;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleaned = plate.trim().toUpperCase();
    if (cleaned.length < 2) {
      setError('Enter your vehicle plate so we can match it at the gate.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await api('/reservations', {
        method: 'POST',
        body: {
          slotId: slot.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          vehiclePlate: cleaned,
          vehicleType: slot.type,
        },
      });
      setConfirmation(data.reservation);
      toast('Reservation confirmed. See you soon!');
      onBooked?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={confirmation ? 'You are all set' : `Reserve bay ${slot.code}`}
      subtitle={
        confirmation
          ? 'Your bay is locked in. A confirmation reference is below.'
          : 'Review the details and add your vehicle plate.'
      }
    >
      {confirmation ? (
        <div className="booking-success">
          <span className="success-icon">
            <Check size={30} />
          </span>
          <div className="reference-box">
            <span>Booking reference</span>
            <strong>{confirmation.reference}</strong>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Bay</dt>
              <dd>
                {confirmation.slot.code} · {confirmation.slot.level}
              </dd>
            </div>
            <div>
              <dt>Window</dt>
              <dd>
                {formatDate(confirmation.startTime)} · {formatTime(confirmation.startTime)} –{' '}
                {formatTime(confirmation.endTime)}
              </dd>
            </div>
            <div>
              <dt>Vehicle</dt>
              <dd>{confirmation.vehiclePlate}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatMoney(confirmation.totalPrice)}</dd>
            </div>
          </dl>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Keep browsing
            </button>
            <Link to="/reservations" className="btn btn-primary" onClick={onClose}>
              View my bookings
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="booking-slot-banner">
            <span className="bay-icon">
              <MapPin size={20} />
            </span>
            <div>
              <strong>
                {slot.code} · {slot.level}
              </strong>
              <span>{typeLabel(slot.type)} bay · {formatMoney(slot.pricePerHour)}/hour</span>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <Clock size={16} />
              <div>
                <span>Date</span>
                <strong>{formatDate(start)}</strong>
              </div>
            </div>
            <div className="summary-item">
              <Clock size={16} />
              <div>
                <span>Time</span>
                <strong>
                  {formatTime(start)} – {formatTime(end)}
                </strong>
              </div>
            </div>
          </div>

          <label className="field">
            <span>Vehicle plate</span>
            <input
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              placeholder="e.g. KA 01 AB 1234"
              maxLength={16}
              autoFocus
              required
            />
            <small>This is how the gate and attendants identify your vehicle.</small>
          </label>

          <div className="price-breakdown">
            <div>
              <span>
                {formatMoney(slot.pricePerHour)} × {hours} {hours === 1 ? 'hour' : 'hours'}
              </span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <small>Free cancellation any time before the reservation starts.</small>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Spinner size={16} /> : <Check size={17} />}
              {submitting ? 'Reserving…' : `Confirm · ${formatMoney(total)}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
