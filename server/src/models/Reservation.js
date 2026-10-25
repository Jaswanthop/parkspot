import crypto from 'node:crypto';
import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    vehiclePlate: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: [16, 'Vehicle plate must be 16 characters or fewer.'],
    },
    vehicleType: {
      type: String,
      enum: ['car', 'bike', 'ev'],
      default: 'car',
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true },
);

// Speeds up the overlap check used when creating a reservation.
reservationSchema.index({ slot: 1, status: 1, startTime: 1, endTime: 1 });
reservationSchema.index({ user: 1, startTime: -1 });

reservationSchema.pre('validate', function assignReference(next) {
  if (!this.reference) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    const bytes = crypto.randomBytes(6);
    for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
    this.reference = `PS-${suffix}`;
  }
  next();
});

export const Reservation = mongoose.model('Reservation', reservationSchema);
