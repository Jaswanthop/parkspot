import { User } from '../models/User.js';
import { Slot } from '../models/Slot.js';
import { Reservation } from '../models/Reservation.js';
import { asyncHandler } from '../utils/AppError.js';
import { serializeReservation, serializeSlot } from '../utils/serialize.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getAdminStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const nextHour = new Date(now.getTime() + HOUR);

  const [totalSlots, activeSlots, totalUsers, totalReservations, upcomingReservations, todaysReservations, cancelledReservations, revenueResult, busySlots, recentReservations] =
    await Promise.all([
      Slot.countDocuments(),
      Slot.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'user' }),
      Reservation.countDocuments(),
      Reservation.countDocuments({ status: 'active', endTime: { $gte: now } }),
      Reservation.countDocuments({
        status: 'active',
        startTime: { $gte: startOfToday, $lte: endOfToday },
      }),
      Reservation.countDocuments({ status: 'cancelled' }),
      Reservation.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Reservation.distinct('slot', {
        status: 'active',
        startTime: { $lt: nextHour },
        endTime: { $gt: now },
      }),
      Reservation.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('slot')
        .populate('user', 'name email')
        .lean(),
    ]);

  const activeSlotIds = await Slot.find({ isActive: true }).select('_id').lean();
  const activeIdSet = new Set(activeSlotIds.map((slot) => slot._id.toString()));
  const occupiedNow = busySlots.filter((id) => activeIdSet.has(id.toString())).length;

  res.json({
    stats: {
      totalSlots,
      activeSlots,
      totalUsers,
      totalReservations,
      upcomingReservations,
      todaysReservations,
      cancelledReservations,
      revenue: Math.round((revenueResult[0]?.total || 0) * 100) / 100,
      occupiedNow,
      occupancyRate: activeSlots ? Math.round((occupiedNow / activeSlots) * 100) : 0,
    },
    recentReservations: recentReservations.map((reservation) =>
      serializeReservation(reservation, { includeUser: true }),
    ),
  });
});

export const listAllReservations = asyncHandler(async (req, res) => {
  const { status, from, to, search, limit } = req.query;
  const now = new Date();

  const filter = {};
  if (status === 'cancelled') {
    filter.status = 'cancelled';
  } else if (status === 'active') {
    filter.status = 'active';
    filter.endTime = { $gte: now };
  } else if (status === 'completed') {
    filter.status = 'active';
    filter.endTime = { $lt: now };
  }

  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = from;
    if (to) filter.startTime.$lte = to;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ reference: pattern }, { vehiclePlate: pattern }];
  }

  const reservations = await Reservation.find(filter)
    .sort({ startTime: -1 })
    .limit(limit)
    .populate('slot')
    .populate('user', 'name email')
    .lean();

  res.json({
    reservations: reservations.map((reservation) =>
      serializeReservation(reservation, { includeUser: true }),
    ),
  });
});

export const listAllSlots = asyncHandler(async (_req, res) => {
  const slots = await Slot.find().sort({ isActive: -1, level: 1, code: 1 }).lean();
  res.json({ slots: slots.map((slot) => serializeSlot(slot)) });
});
