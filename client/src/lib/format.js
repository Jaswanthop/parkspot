export function toDateInput(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeInput(date) {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function combineDateTime(dateString, timeString) {
  return new Date(`${dateString}T${timeString}:00`);
}

export function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function defaultStart() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const minutes = date.getMinutes();
  date.setMinutes(minutes <= 30 ? 30 : 60, 0, 0);
  if (date.getHours() < 6) date.setHours(8, 0, 0, 0);
  if (date.getHours() > 21) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value, options = {}) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatDateTime(value) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return `${formatDate(startDate)} · ${formatTime(startDate)} – ${formatTime(endDate)}`;
  }
  return `${formatDateTime(startDate)} → ${formatDateTime(endDate)}`;
}

export function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function durationLabel(start, end) {
  const hours = (new Date(end) - new Date(start)) / (60 * 60 * 1000);
  if (Number.isInteger(hours)) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

export function isPast(start) {
  return new Date(start).getTime() < Date.now();
}

export function zoneLabel(zone) {
  const labels = {
    standard: 'Standard',
    premium: 'Premium',
    ev: 'EV charging',
    accessible: 'Accessible',
    motorbike: 'Motorbike',
  };
  return labels[zone] || zone;
}

export function typeLabel(type) {
  return { car: 'Car', bike: 'Motorbike', ev: 'Electric' }[type] || type;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
