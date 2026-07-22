const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminNotificationSchema = new Schema(
  {
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
        "bike_rider_registration_pending",
        "ambulance_driver_registration_pending",
      ],
      required: true,
      index: true,
    },

    targetType: {
      type: String,
      enum: ["bike_rider", "ambulance_driver"],
      required: true,
      index: true,
    },

    targetModel: {
      type: String,
      enum: ["Rider", "AmbulanceDriver"],
      required: true,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "targetModel",
      index: true,
    },

    targetName: {
      type: String,
      trim: true,
      default: "",
    },

    targetPhone: {
      type: String,
      trim: true,
      default: "",
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "blocked"],
      default: "pending",
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

adminNotificationSchema.index({ createdAt: -1 });
adminNotificationSchema.index({ targetType: 1, targetId: 1, approvalStatus: 1 });

adminNotificationSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;

    delete ret._id;
    delete ret.__v;

    return ret;
  },
});

module.exports = mongoose.model(
  "AdminNotification",
  adminNotificationSchema
);