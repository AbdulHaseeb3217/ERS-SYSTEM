const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        // Ambulance notifications
        "ambulance_request_accepted",
        "ambulance_request_cancelled",
        "ambulance_request_completed",

        // Bike ride notifications
        "bike_ride_request_accepted",
        "bike_ride_request_cancelled",
        "bike_ride_request_completed",

        // Medicine order notifications
        "medicine_order_accepted",
        "medicine_order_cancelled",
        "medicine_order_completed",
      ],
      required: true,
      index: true,
    },

    requestType: {
      type: String,
      enum: ["ambulance", "bike_ride", "medicine_order"],
      required: true,
      index: true,
    },

    requestModel: {
      type: String,
      enum: ["AmbulanceRequest", "BikeRide", "MedicineOrder"],
      required: true,
    },

    requestId: {
      type: Schema.Types.ObjectId,
      refPath: "requestModel",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["accepted", "cancelled", "completed"],
      required: true,
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ patient: 1, createdAt: -1 });
notificationSchema.index({
  patient: 1,
  requestType: 1,
  requestId: 1,
  status: 1,
});

notificationSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;

    delete ret._id;
    delete ret.__v;

    return ret;
  },
});

module.exports = mongoose.model("Notification", notificationSchema);