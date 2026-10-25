import { z } from 'zod';
import { SLOT_TYPES, SLOT_ZONES } from '../models/Slot.js';

const email = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(120, 'Email is too long.')
  .email('Enter a valid email address.')
  .toLowerCase();

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/[0-9]/, 'Password must include a number.');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(60, 'Name must be 60 characters or fewer.'),
  email,
  password,
  phone: z.string().trim().max(24, 'Phone number is too long.').optional().default(''),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(72),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(60, 'Name must be 60 characters or fewer.')
    .optional(),
  phone: z.string().trim().max(24, 'Phone number is too long.').optional(),
});

export const slotQuerySchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  type: z.enum(SLOT_TYPES).optional(),
  level: z.string().trim().max(30).optional(),
});

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'That is not a valid identifier.');

export const slotCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Slot code is required.')
    .max(12, 'Slot code must be 12 characters or fewer.')
    .regex(/^[A-Za-z0-9-]+$/, 'Slot code can only contain letters, numbers and dashes.'),
  level: z.string().trim().min(1, 'Level is required.').max(30, 'Level is too long.'),
  zone: z.enum(SLOT_ZONES).optional().default('standard'),
  type: z.enum(SLOT_TYPES).optional().default('car'),
  pricePerHour: z.coerce
    .number()
    .min(0, 'Price cannot be negative.')
    .max(500, 'Price is unrealistically high.'),
  features: z
    .array(z.string().trim().min(1).max(30, 'Feature is too long.'))
    .max(8, 'Use 8 features or fewer.')
    .optional()
    .default([]),
  isActive: z.boolean().optional().default(true),
});

export const slotUpdateSchema = slotCreateSchema.partial();

export const slotIdSchema = z.object({ id: objectId });

export const createReservationSchema = z.object({
  slotId: objectId,
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  vehiclePlate: z
    .string()
    .trim()
    .min(2, 'Enter a valid vehicle plate.')
    .max(16, 'Vehicle plate must be 16 characters or fewer.')
    .regex(/^[A-Za-z0-9 -]+$/, 'Vehicle plate can only contain letters, numbers, spaces and dashes.'),
  vehicleType: z.enum(['car', 'bike', 'ev']),
});

export const myReservationsQuerySchema = z.object({
  scope: z.enum(['all', 'upcoming', 'past', 'cancelled']).optional().default('all'),
});

export const adminReservationsQuerySchema = z.object({
  status: z.enum(['all', 'active', 'completed', 'cancelled']).optional().default('all'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export const reservationIdSchema = z.object({ id: objectId });
