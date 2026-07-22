// api/models/bikeRide.model.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    // [longitude, latitude]
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },
  { _id: false }
);

const bikeRideSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    rider: {
      type: Schema.Types.ObjectId,
      ref: "Rider",
    },

    rideCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    patientInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    riderInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      bikeNumber: { type: String, trim: true },
    },

    pickupLocation: locationSchema,

    dropoffLocation: locationSchema,

    // Bike rider ki live location patient tracking ke liye
    riderLiveLocation: locationSchema,

    riderLocationUpdatedAt: {
      type: Date,
    },

    autoAssigned: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "arrived_at_pickup",
        "arrived_at_patient",
        "in_progress",
        "navigating_to_hospital",
        "payment_pending",
        "completed",
        "cancelled",
        "no_rider",
      ],
      default: "pending",
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    acceptedAt: Date,
    pickupReachedAt: Date,
    dropoffReachedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    cancelledBy: {
      type: String,
      enum: ["patient", "rider", "system", null],
      default: null,
    },

    etaToPickupMinutes: {
      type: Number,
      min: 0,
    },

    etaToDestinationMinutes: {
      type: Number,
      min: 0,
    },

    totalEtaMinutes: {
      type: Number,
      min: 0,
    },

    fareAmount: {
      type: Number,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash"],
      default: "cash",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
  },
  {
    timestamps: true,
  }
);

bikeRideSchema.index({ "pickupLocation.coordinates": "2dsphere" });
bikeRideSchema.index({ "riderLiveLocation.coordinates": "2dsphere" });
bikeRideSchema.index({ patient: 1, requestedAt: -1 });
bikeRideSchema.index({ rider: 1, requestedAt: -1 });
bikeRideSchema.index({ status: 1 });

bikeRideSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("BikeRide", bikeRideSchema);