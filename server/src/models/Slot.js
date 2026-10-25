import mongoose from 'mongoose';

export const SLOT_ZONES = ['standard', 'premium', 'ev', 'accessible', 'motorbike'];
export const SLOT_TYPES = ['car', 'bike', 'ev'];

const slotSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Slot code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [12, 'Slot code must be 12 characters or fewer.'],
    },
    level: {
      type: String,
      required: [true, 'Level is required.'],
      trim: true,
      maxlength: [30, 'Level must be 30 characters or fewer.'],
    },
    zone: {
      type: String,
      enum: SLOT_ZONES,
      default: 'standard',
    },
    type: {
      type: String,
      enum: SLOT_TYPES,
      default: 'car',
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Hourly price is required.'],
      min: [0, 'Price cannot be negative.'],
      max: [500, 'Price is unrealistically high.'],
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

slotSchema.index({ level: 1, code: 1 });

export const Slot = mongoose.model('Slot', slotSchema);
