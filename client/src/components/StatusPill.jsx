export function StatusPill({ status }) {
  const labels = {
    active: 'Reserved',
    upcoming: 'Upcoming',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" />
      {labels[status] || status}
    </span>
  );
}

export function AvailabilityPill({ available }) {
  return (
    <span className={`status-pill ${available ? 'status-open' : 'status-busy'}`}>
      <span className="status-dot" />
      {available ? 'Available' : 'Booked'}
    </span>
  );
}
