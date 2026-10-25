import { Accessible, Bike, Bolt, Car, MapPin } from './Icons.jsx';
import { AvailabilityPill } from './StatusPill.jsx';
import { formatMoney, typeLabel, zoneLabel } from '../lib/format.js';

const ICONS = { car: Car, bike: Bike, ev: Bolt, accessible: Accessible };

export function SlotCard({ slot, onReserve, disabled = false }) {
  const Icon = ICONS[slot.type === 'car' && slot.zone === 'accessible' ? 'accessible' : slot.type] || Car;

  return (
    <article className={`slot-card ${slot.available ? '' : 'is-busy'}`}>
      <div className="slot-top">
        <div>
          <span className="slot-code">{slot.code}</span>
          <span className="slot-level">
            <MapPin size={12} /> {slot.level}
          </span>
        </div>
        <AvailabilityPill available={slot.available} />
      </div>

      <div className="slot-visual">
        <span className={`bay-icon bay-${slot.zone}`}>
          <Icon size={24} />
        </span>
        <div>
          <strong>{zoneLabel(slot.zone)}</strong>
          <span>{typeLabel(slot.type)} bay</span>
        </div>
      </div>

      <div className="slot-price">
        {formatMoney(slot.pricePerHour)} <span>/ hour</span>
      </div>

      <ul className="feature-list">
        {slot.features.slice(0, 3).map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
        {slot.features.length === 0 && <li>Standard bay</li>}
      </ul>

      <button
        type="button"
        className={`btn ${slot.available ? 'btn-primary' : 'btn-ghost'} btn-block`}
        disabled={!slot.available || disabled}
        onClick={() => onReserve(slot)}
      >
        {!slot.available ? 'Already booked' : disabled ? 'Choose a future time' : 'Reserve this bay'}
      </button>
    </article>
  );
}

export function SlotSkeleton() {
  return (
    <div className="slot-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-line w-40" />
      <div className="skeleton skeleton-block" />
      <div className="skeleton skeleton-line w-60" />
      <div className="skeleton skeleton-line w-80" />
      <div className="skeleton skeleton-line w-100" />
    </div>
  );
}
