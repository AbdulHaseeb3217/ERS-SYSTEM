// models/pharmacy.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const pharmacyVerificationSchema = new Schema(
  {
    // Tab: Verification Status (from pharmacy portal UI)
    adminApproval: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    licenseStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    ersNetworkStatus: {
      type: String,
      enum: ['disconnected', 'connected'],
      default: 'disconnected',
    },
    lastReviewAt: Date,
    nextReviewAt: Date,
  },
  { _id: false }
);

const pharmacySchema = new Schema(
  {
    // Basic account & profile
    pharmacyName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    pharmacyId: {
      type: String,
      unique: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // UI: Operating hours field
    operatingHours: {
      type: String,
      default: '24/7',
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    // For map and nearby pharmacy search
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0,0],
      },
    },

    // Main status used in admin list (active/pending/blocked)
    status: {
      type: String,
      enum: ['active', 'pending', 'blocked'],
      default: 'pending',
    },

    // Pharmacy online/offline toggle for prescription requests
    isOnline: {
      type: Boolean,
      default: false,
    },

    ignoredBy: 
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy'
  },

    // Dashboard stat
    totalOrders: {
      type: Number,
      default: 0,
    },

    verification: {
      type: pharmacyVerificationSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true, // createdAt = join date
  }
);

pharmacySchema.index({ location: '2dsphere' });

pharmacySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.joinDate = ret.createdAt
      ? ret.createdAt.toISOString().split('T')[0]
      : null;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('Pharmacy', pharmacySchema);
