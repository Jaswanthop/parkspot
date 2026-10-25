import { Slot } from '../models/Slot.js';
import { User } from '../models/User.js';
import { Reservation } from '../models/Reservation.js';
import { env } from '../config/env.js';

const SLOT_SEED = [
  { code: 'A-01', level: 'Level A', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['Covered', 'CCTV', 'Near lift'] },
  { code: 'A-02', level: 'Level A', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['Covered', 'CCTV'] },
  { code: 'A-03', level: 'Level A', zone: 'premium', type: 'car', pricePerHour: 4, features: ['Covered', 'CCTV', 'Wide bay', 'Near lift'] },
  { code: 'A-04', level: 'Level A', zone: 'accessible', type: 'car', pricePerHour: 2.5, features: ['Accessible', 'Wide bay', 'Near lift'] },
  { code: 'A-05', level: 'Level A', zone: 'ev', type: 'ev', pricePerHour: 3.5, features: ['EV charger', 'Covered', 'CCTV'] },
  { code: 'A-06', level: 'Level A', zone: 'ev', type: 'ev', pricePerHour: 3.5, features: ['EV charger', 'Covered'] },
  { code: 'A-07', level: 'Level A', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['CCTV'] },
  { code: 'A-08', level: 'Level A', zone: 'premium', type: 'car', pricePerHour: 4, features: ['Covered', 'CCTV', 'Wide bay'] },

  { code: 'B-01', level: 'Level B', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['Covered', 'CCTV'] },
  { code: 'B-02', level: 'Level B', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['CCTV'] },
  { code: 'B-03', level: 'Level B', zone: 'premium', type: 'car', pricePerHour: 4, features: ['Covered', 'CCTV', 'Wide bay'] },
  { code: 'B-04', level: 'Level B', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['Covered', 'CCTV'] },
  { code: 'B-05', level: 'Level B', zone: 'premium', type: 'car', pricePerHour: 4, features: ['Covered', 'Near lift', 'Wide bay'] },
  { code: 'B-06', level: 'Level B', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['CCTV'] },
  { code: 'B-07', level: 'Level B', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['Covered', 'CCTV'] },
  { code: 'B-08', level: 'Level B', zone: 'ev', type: 'ev', pricePerHour: 3.5, features: ['EV charger', 'Covered', 'Near lift'] },

  { code: 'C-01', level: 'Level C', zone: 'motorbike', type: 'bike', pricePerHour: 1.5, features: ['Motorbike rack', 'CCTV'] },
  { code: 'C-02', level: 'Level C', zone: 'motorbike', type: 'bike', pricePerHour: 1.5, features: ['Motorbike rack', 'CCTV'] },
  { code: 'C-03', level: 'Level C', zone: 'motorbike', type: 'bike', pricePerHour: 1.5, features: ['Motorbike rack', 'Covered'] },
  { code: 'C-04', level: 'Level C', zone: 'motorbike', type: 'bike', pricePerHour: 1.5, features: ['Motorbike rack', 'CCTV'] },
  { code: 'C-05', level: 'Level C', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['CCTV'] },
  { code: 'C-06', level: 'Level C', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['Covered', 'CCTV'] },
  { code: 'C-07', level: 'Level C', zone: 'standard', type: 'car', pricePerHour: 2.5, features: ['CCTV'] },
  { code: 'C-08', level: 'Level C', zone: 'premium', type: 'car', pricePerHour: 4, features: ['Covered', 'Wide bay', 'Near lift'] },
];

function atLocalTime(dayOffset, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seedDemoReservations() {
  const demo = await User.findOne({ email: env.demoEmail });
  if (!demo) return 0;

  const existing = await Reservation.countDocuments({ user: demo._id });
  if (existing > 0) return 0;

  const slots = await Slot.find({
    code: { $in: ['A-02', 'B-04', 'C-06'] },
    isActive: true,
  });
  const byCode = new Map(slots.map((slot) => [slot.code, slot]));

  const samples = [
    { code: 'A-02', start: atLocalTime(1, 10), end: atLocalTime(1, 12), plate: 'DEMO 01' },
    { code: 'B-04', start: atLocalTime(2, 14), end: atLocalTime(2, 17), plate: 'DEMO 01' },
    { code: 'C-06', start: atLocalTime(-3, 9), end: atLocalTime(-3, 11), plate: 'DEMO 01' },
  ];

  let created = 0;
  for (const sample of samples) {
    const slot = byCode.get(sample.code);
    if (!slot) continue;
    const hours = (sample.end - sample.start) / (60 * 60 * 1000);
    await Reservation.create({
      user: demo._id,
      slot: slot._id,
      startTime: sample.start,
      endTime: sample.end,
      vehiclePlate: sample.plate,
      vehicleType: slot.type,
      totalPrice: Math.round(slot.pricePerHour * hours * 100) / 100,
      status: 'active',
    });
    created += 1;
  }
  return created;
}

export async function seedDatabase({ logger = console } = {}) {
  const result = { slotsCreated: 0, adminCreated: false, demoCreated: false, demoReservations: 0 };

  const slotCount = await Slot.estimatedDocumentCount();
  if (slotCount === 0) {
    await Slot.insertMany(SLOT_SEED);
    result.slotsCreated = SLOT_SEED.length;
  }

  let admin = await User.findOne({ email: env.adminEmail });
  if (!admin) {
    admin = await User.create({
      name: env.adminName,
      email: env.adminEmail,
      passwordHash: await User.hashPassword(env.adminPassword),
      role: 'admin',
    });
    result.adminCreated = true;
  } else if (admin.role !== 'admin') {
    logger.warn(`[seed] ${env.adminEmail} exists but is not an admin; leaving the role unchanged.`);
  }

  if (env.seedDemo) {
    let demo = await User.findOne({ email: env.demoEmail });
    if (!demo) {
      demo = await User.create({
        name: env.demoName,
        email: env.demoEmail,
        passwordHash: await User.hashPassword(env.demoPassword),
        role: 'user',
      });
      result.demoCreated = true;
    }
    result.demoReservations = await seedDemoReservations();
  }

  logger.info(
    `[seed] slots +${result.slotsCreated}, admin ${result.adminCreated ? 'created' : 'ready'}, demo ${result.demoCreated ? 'created' : 'ready'}, demo bookings +${result.demoReservations}`,
  );
  return result;
}

export { SLOT_SEED };
