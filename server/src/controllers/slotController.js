import { Slot } from '../models/Slot.js';
import { Reservation } from '../models/Reservation.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { serializeSlot } from '../utils/serialize.js';

const HOUR = 60 * 60 * 1000;
const MAX_RANGE = 7 * 24 * HOUR;

function resolveRange(query) {
  const now = new Date();
  let start = query.start || null;
  let end = query.end || null;

  if (!start && !end) {
    start = now;
    end = new Date(now.getTime() + HOUR);
  } else if (start && !end) {
    end = new Date(start.getTime() + HOUR);
  } else if (!start && end) {
    start = new Date(end.getTime() - HOUR);
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError(422, 'Enter a valid start and end time.');
  }
  if (end <= start) {
    throw new AppError(422, 'The end time must be after the start time.');
  }
  if (end.getTime() - start.getTime() > MAX_RANGE) {
    throw new AppError(422, 'Availability can be checked for up to 7 days at a time.');
  }
  return { start, end };
}

export const listSlots = asyncHandler(async (req, res) => {
  const { start, end } = resolveRange(req.query);

  const filter = { isActive: true };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.level) filter.level = req.query.level;

  const slots = await Slot.find(filter).sort({ level: 1, code: 1 }).lean();
  const slotIds = slots.map((slot) => slot._id);

  // A slot is busy when an active reservation intersects the requested window.
  const conflicts = slotIds.length
    ? await Reservation.find({
        slot: { $in: slotIds },
        status: 'active',
        startTime: { $lt: end },
        endTime: { $gt: start },
      })
        .select('slot')
        .lean()
    : [];

  const busy = new Set(conflicts.map((reservation) => reservation.slot.toString()));
  const serialized = slots.map((slot) => serializeSlot(slot, !busy.has(slot._id.toString())));

  res.json({
    slots: serialized,
    meta: {
      start,
      end,
      total: serialized.length,
      available: serialized.filter((slot) => slot.available).length,
    },
  });
});

export const getSlotStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + HOUR);

  const slots = await Slot.find({ isActive: true }).lean();
  const slotIds = slots.map((slot) => slot._id);

  const conflicts = slotIds.length
    ? await Reservation.find({
        slot: { $in: slotIds },
        status: 'active',
        startTime: { $lt: inOneHour },
        endTime: { $gt: now },
      })
        .select('slot')
        .lean()
    : [];

  const busy = new Set(conflicts.map((reservation) => reservation.slot.toString()));
  const availableNow = slots.length - busy.size;
  const levels = [...new Set(slots.map((slot) => slot.level))].sort();
  const priceFrom = slots.length
    ? Math.min(...slots.map((slot) => slot.pricePerHour))
    : 0;

  const typeCounts = slots.reduce(
    (acc, slot) => {
      acc[slot.type] = (acc[slot.type] || 0) + 1;
      return acc;
    },
    { car: 0, bike: 0, ev: 0 },
  );

  res.json({
    stats: {
      totalSlots: slots.length,
      availableNow,
      occupiedNow: slots.length - availableNow,
      levels,
      priceFrom,
      types: typeCounts,
    },
  });
});

export const getSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findById(req.params.id);
  if (!slot) throw new AppError(404, 'That parking slot does not exist.');
  res.json({ slot: serializeSlot(slot) });
});

export const createSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.create(req.body);
  res.status(201).json({ slot: serializeSlot(slot) });
});

export const updateSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findById(req.params.id);
  if (!slot) throw new AppError(404, 'That parking slot does not exist.');

  const fields = ['code', 'level', 'zone', 'type', 'pricePerHour', 'features', 'isActive'];
  for (const field of fields) {
    if (req.body[field] !== undefined) slot[field] = req.body[field];
  }
  await slot.save();
  res.json({ slot: serializeSlot(slot) });
});

export const deleteSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findById(req.params.id);
  if (!slot) throw new AppError(404, 'That parking slot does not exist.');

  const bookingCount = await Reservation.countDocuments({ slot: slot._id });
  if (bookingCount > 0) {
    // Keep historical bookings intact instead of orphaning them.
    slot.isActive = false;
    await slot.save();
    return res.json({
      slot: serializeSlot(slot),
      archived: true,
      message: 'This slot has booking history, so it was archived instead of deleted.',
    });
  }

  await slot.deleteOne();
  return res.json({ message: 'Parking slot deleted.', archived: false });
});
