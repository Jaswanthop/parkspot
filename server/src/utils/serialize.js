export function serializeUser(user) {
  if (!user) return null;
  return {
    id: user._id?.toString?.() || user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function serializeSlot(slot, available) {
  if (!slot) return null;
  const base = {
    id: slot._id.toString(),
    code: slot.code,
    level: slot.level,
    zone: slot.zone,
    type: slot.type,
    pricePerHour: slot.pricePerHour,
    features: slot.features || [],
    isActive: slot.isActive,
  };
  if (typeof available === 'boolean') base.available = available;
  return base;
}

/**
 * Reservations remain "active" in MongoDB after their end time so history is
 * never rewritten. The API reports them as "completed" when reading them.
 */
export function effectiveStatus(reservation, now = new Date()) {
  if (reservation.status === 'active' && new Date(reservation.endTime) < now) {
    return 'completed';
  }
  return reservation.status;
}

export function isUpcoming(reservation, now = new Date()) {
  return (
    reservation.status === 'active' && new Date(reservation.endTime) >= now
  );
}

export function serializeReservation(reservation, { includeUser = false } = {}) {
  const slot = reservation.slot;
  const output = {
    id: reservation._id.toString(),
    reference: reservation.reference,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    vehiclePlate: reservation.vehiclePlate,
    vehicleType: reservation.vehicleType,
    totalPrice: reservation.totalPrice,
    status: effectiveStatus(reservation),
    createdAt: reservation.createdAt,
    slot:
      slot && typeof slot === 'object' && slot.code
        ? serializeSlot(slot)
        : slot?.toString?.() || null,
  };
  if (includeUser && reservation.user && typeof reservation.user === 'object' && reservation.user.email) {
    output.user = serializeUser(reservation.user);
  }
  return output;
}
