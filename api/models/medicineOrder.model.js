// models/medicineOrder.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Re-use same location structure
const locationSchema = new Schema(
  {
    address: { type: String, trim: true },

    // [longitude, latitude]
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },
  { _id: false }
);

const medicineOrderSchema = new Schema(
  {
    // Kis patient ne order place kiya
    patient: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },

    // Final jis pharmacy ne approve / dispatch kiya
    pharmacy: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
    },

    // Delivery ke liye assigned rider
    rider: {
      type: Schema.Types.ObjectId,
      ref: 'Rider',
    },

    // UI code: MED-001, MED-002 ...
    orderCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    // Snapshot info
    patientInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    pharmacyInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    riderInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      bikeNumber: { type: String, trim: true },
    },

    // Delivery location
    deliveryLocation: locationSchema,

    // Bike rider live location
    riderLiveLocation: locationSchema,

    riderLocationUpdatedAt: {
      type: Date,
    },


    // Medicines list
    medicineItems: [
      {
        type: String,
        trim: true,
      },
    ],


    // Medical equipment list
    equipmentItems: [
      {
        type: String,
        trim: true,
      },
    ],


    // Prescription image
    prescriptionImageUrl: {
      type: String,
      trim: true,
    },


    // Emergency / regular
    priority: {
      type: String,
      enum: ['emergency', 'regular'],
      default: 'regular',
    },


    // Order status
    status: {
      type: String,
      enum: [
        'pharmacy_processing',
        'dispatching',
        'delivering',
        'reached_pharmacy',
        'navigating_to_patient',
        'payment_pending',
        'delivered',
        'cancelled',
      ],
      default: 'pharmacy_processing',
    },


    ignoredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy'
      }
    ],


    // Timeline
    requestedAt: {
      type: Date,
      default: Date.now,
    },

    approvedAt: Date,

    riderAssignedAt: Date,

    reachedPharmacyAt: Date,

    navigatingToPatientAt: Date,

    paymentPendingAt: Date,

    deliveredAt: Date,

    cancelledAt: Date,


    cancelledBy: {
      type: String,
      enum: ['patient', 'pharmacy', 'rider', 'system', null],
      default: null,
    },


    estimatedDeliveryMinutes: {
      type: Number,
      min: 0,
    },


    // Existing amount (keep because old payment flow may use it)
    amount: {
      type: Number,
      min: 0,
    },


    // ===============================
    // NEW PRICE BREAKDOWN SYSTEM
    // ===============================

    pricing: {

      // Medicine total price
      medicineAmount: {
        type: Number,
        min: 0,
        default: 0,
      },


      // Medical equipment total price
      equipmentAmount: {
        type: Number,
        min: 0,
        default: 0,
      },


      // Rider delivery charges
      deliveryCharges: {
        type: Number,
        min: 0,
        default: 0,
      },


      // medicine + equipment + delivery
      totalAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

    },


    // Rider earning will be equal to delivery charges
    riderEarning: {
      type: Number,
      min: 0,
      default: 0,
    },


    // Payment
    paymentMethod: {
      type: String,
      enum: ['cash'],
      default: 'cash',
    },


    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },

  },
  {
    timestamps: true,
  }
);


// Geo index
medicineOrderSchema.index({
  'deliveryLocation.coordinates': '2dsphere'
});


// History queries
medicineOrderSchema.index({
  patient: 1,
  requestedAt: -1
});

medicineOrderSchema.index({
  pharmacy: 1,
  requestedAt: -1
});

medicineOrderSchema.index({
  rider: 1,
  requestedAt: -1
});

medicineOrderSchema.index({
  status: 1
});


// Clean JSON
medicineOrderSchema.set(
  'toJSON',
  {
    transform: (doc, ret) => {

      ret.id = ret._id;

      delete ret._id;

      delete ret.__v;

      return ret;

    },
  }
);


module.exports = mongoose.model(
  'MedicineOrder',
  medicineOrderSchema
);