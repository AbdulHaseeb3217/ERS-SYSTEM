const mongoose = require("mongoose");
const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    address: { type: String, trim: true },

    // ✅ GeoJSON (Recommended for 2dsphere)
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 2,
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

const selectedHospitalSchema = new Schema(
  {
    placeId: { type: String, trim: true },

    name: { type: String, trim: true },

    address: { type: String, trim: true },

    rating: { type: Schema.Types.Mixed },

    openNow: { type: Boolean },

    openingTime: { type: String, trim: true },

    phone: { type: String, trim: true },

    lat: { type: Number },

    lng: { type: Number },

    location: locationSchema,

    selectedBy: {
      type: String,
      enum: ["patient", "driver"],
    },

    selectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ambulanceRequestSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    driver: {
      type: Schema.Types.ObjectId,
      ref: "AmbulanceDriver",
    },

    orderCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    patientInfo: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    hospitalName: { type: String, trim: true },
    hospitalLocation: locationSchema,

    selectedHospital: selectedHospitalSchema,

    requestFor: {
      type: String,
      enum: ["self", "family", "random_person"],
      required: true,
    },

    priority: {
      type: String,
      enum: ["critical"],
      default: "critical",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "in-progress",
        "arrived_at_patient",
        "hospital_selecting",
        "navigating_to_hospital",
        "patient_dropped",
        "payment_pending",
        "completed",
        "cancelled",
        "no_driver",
      ],
      default: "pending",
    },

    requestedAt: { type: Date, default: Date.now },

    pickupLocation: locationSchema,
    dropoffLocation: locationSchema,

    distanceKmToPatient: Number,
    etaMinutesToPatient: Number,

    fareAmount: { type: Number, min: 0 },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

// ✅ correct 2dsphere index for GeoJSON object
ambulanceRequestSchema.index({ pickupLocation: "2dsphere" });

ambulanceRequestSchema.index({ patient: 1, requestedAt: -1 });
ambulanceRequestSchema.index({ driver: 1, requestedAt: -1 });
ambulanceRequestSchema.index({ status: 1, priority: 1 });

ambulanceRequestSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("AmbulanceRequest", ambulanceRequestSchema);