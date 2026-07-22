// models/rider.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const riderSchema = new Schema(
  {
    // Basic account info
    fullName: {
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

    // UI pe Rider ID: #B12345
    riderId: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
    },

    // Hashed password
    passwordHash: {
      type: String,
      required: true,
    },

    // Profile info (Figma + Admin Rider Management)
    cnic: {
      type: String,
      trim: true,
    },

    // ✅ NEW: CNIC image Base64 / URL field
    cnicImageUrl: {
      type: String,
      trim: true,
    },

    // Rider app: Date of Birth (YYYY-MM-DD)
    dateOfBirth: {
      type: Date,
    },

    address: {
      type: String,
      trim: true,
    },

    // Vehicle & license info
    vehicleType: {
      type: String,
      default: 'Bike',
      trim: true,
    },

    bikeNumber: {
      type: String,
      trim: true,
      unique: true,
    },

    licenseNumber: {
      type: String,
      trim: true,
    },

    // Status from admin panel (active/pending/blocked)
    status: {
      type: String,
      enum: ['active', 'pending', 'blocked'],
      default: 'pending',
    },

    // Availability toggle (online/offline)
    isOnline: {
      type: Boolean,
      default: false,
    },

    // Live location for nearby search & tracking
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // [lng, lat]
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    // Dashboard stats / past history counters
    totalDeliveries: {
      type: Number,
      default: 0,
    },

    totalRides: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt = join date
  }
);

// Geo index for nearby search
riderSchema.index({ location: '2dsphere' });

/**
 * Virtual: age
 * DB mein sirf dateOfBirth store hogi,
 * lekin API response mein rider.age auto calculate ho jayega
 * (Admin Rider Management ke "Age" column ke liye).
 */
riderSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;

  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const m = today.getMonth() - this.dateOfBirth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }

  return age;
});

// Clean JSON for API responses
riderSchema.set('toJSON', {
  virtuals: true, // age bhi response mein aayega
  transform: (doc, ret) => {
    ret.id = ret._id;

    // Join Date for UI: "2024-02-10" style
    ret.joinDate = ret.createdAt
      ? ret.createdAt.toISOString().split('T')[0]
      : null;

    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('Rider', riderSchema);
