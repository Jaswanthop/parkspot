import { Slot } from '../models/Slot.js';
import { Reservation } from '../models/Reservation.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { serializeReservation } from '../utils/serialize.js';
import { withLock } from '../utils/lock.js';

const MIN_DURATION = 30 * 60 * 1000;
const MAX_DURATION = 12 * 60 * 60 * 1000;
const MAX_ADVANCE = 60 * 24 * 60 * 60 * 1000;

function validateWindow(startTime, endTime) {
  const now = Date.now();
  const start = startTime.getTime();
  const end = endTime.getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new AppError(422, 'Enter a valid start and end time.');
  }
  if (end <= start) {
    throw new AppError(422, 'The end time must be after the start time.');
  }
  if (start < now - 2 * 60 * 1000) {
    throw new AppError(422, 'The start time cannot be in the past.');
  }
  if (end - start < MIN_DURATION) {
    throw new AppError(422, 'A reservation must be at least 30 minutes long.');
  }
  if (end - start > MAX_DURATION) {
    throw new AppError(422, 'A reservation can be at most 12 hours long.');
  }
  if (start > now + MAX_ADVANCE) {
    throw new AppError(422, 'Reservations can be made at most 60 days in advance.');
  }
}

export const createReservation = asyncHandler(async (req, res) => {
  const { slotId, startTime, endTime, vehiclePlate, vehicleType } = req.body;

  validateWindow(startTime, endTime);

  const slot = await Slot.findById(slotId);
  if (!slot || !slot.isActive) {
    throw new AppError(404, 'That parking slot is not available.');
  }
  if (slot.type !== vehicleType) {
    throw new AppError(422, `Bay ${slot.code} is reserved for ${slot.type} vehicles.`);
  }

  const hours = (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000);
  const totalPrice = Math.round(slot.pricePerHour * hours * 100) / 100;

  const reservation = await withLock(slot._id.toString(), async () => {
    // Re-check inside the lock: someone may have booked between page load and submit.
    const conflict = await Reservation.findOne({
      slot: slot._id,
      status: 'active',
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    })
      .select('_id')
      .lean();

    if (conflict) {
      throw new AppError(409, 'That bay was just taken for this time. Please pick another.');
    }

    return Reservation.create({
      user: req.user._id,
      slot: slot._id,
      startTime,
      endTime,
      vehiclePlate,
      vehicleType,
      totalPrice,
      status: 'active',
    });
  });

  await reservation.populate('slot');
  res.status(201).json({ reservation: serializeReservation(reservation) });
});

export const listMyReservations = asyncHandler(async (req, res) => {
  const { scope } = req.query;
  const now = new Date();

  const filter = { user: req.user._id };
  if (scope === 'upcoming') {
    filter.status = 'active';
    filter.endTime = { $gte: now };
  } else if (scope === 'past') {
    filter.status = 'active';
    filter.endTime = { $lt: now };
  } else if (scope === 'cancelled') {
    filter.status = 'cancelled';
  }

  const reservations = await Reservation.find(filter)
    .sort({ startTime: -1 })
    .populate('slot')
    .lean();

  res.json({
    reservations: reservations.map((reservation) => serializeReservation(reservation)),
  });
});

export const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id).populate('slot');
  if (!reservation) throw new AppError(404, 'That reservation does not exist.');

  const isOwner = reservation.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    throw new AppError(403, 'You can only cancel your own reservations.');
  }
  if (reservation.status === 'cancelled') {
    throw new AppError(409, 'This reservation is already cancelled.');
  }
  if (new Date(reservation.startTime) <= new Date()) {
    throw new AppError(409, 'Reservations can only be cancelled before their start time.');
  }

  reservation.status = 'cancelled';
  await reservation.save();

  res.json({ reservation: serializeReservation(reservation) });
});
