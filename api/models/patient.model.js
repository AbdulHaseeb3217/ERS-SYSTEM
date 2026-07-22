// models/patient.model.js

const mongoose = require('mongoose');

const { Schema } = mongoose;

const patientSchema = new Schema(
  {
    // Basic account info
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },


    // Emergency contact (family member's phone)
    emergencyContact: {
      type: String,
      trim: true,
    },


    // Hashed password (never store plain text)
    passwordHash: {
      type: String,
      required: true,
    },

    // Profile info
    cnic: {
      type: String,
      trim: true,
    },

    // 🔹 Age field hataya, ab Date of Birth rakhenge
    dateOfBirth: {
      type: Date,
      required: true,
    },

    address: {
      type: String,
      trim: true,
      required: true,
    },

    // Saved last known location (for nearby search)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // [longitude, latitude]
      coordinates: {
        type: [Number],
        default: [0,0],
      },
    },

    // active = normal user, blocked = admin ne block kiya
    status: {
      type: String,
      enum: ['active', 'blocked', 'pending'],
      default: 'active',
    },

    // Dashboard stats
    totalEmergencyCalls: {
      type: Number,
      default: 0,
    },

    totalBikeRides: {
      type: Number,
      default: 0,
    },

    totalMedicineOrders: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt (join date) & updatedAt
  }
);

// Geo index for location (nearby ambulance/rider search)
patientSchema.index({ location: '2dsphere' });

/**
 * Virtual age = calculate from dateOfBirth
 */
patientSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Clean JSON output (hide passwordHash, __v)
patientSchema.set('toJSON', {
  virtuals: true, // age ko JSON me include karega
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.joinDate = ret.createdAt ? ret.createdAt.toISOString().split('T')[0] : null;
    ret.age = doc.age; // virtual age
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('Patient', patientSchema);
