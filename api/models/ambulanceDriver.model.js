const mongoose = require("mongoose");
const { Schema } = mongoose;

const ambulanceDriverSchema = new Schema(
  {
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

    driverId: {
      type: String,
      unique: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    // ✅ CNIC text field same rakhi hai
    cnic: {
      type: String,
      trim: true,
    },

    // ✅ NEW: CNIC image Base64 / URL field
    cnicImageUrl: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    vehicleType: {
      type: String,
      default: "Ambulance",
      trim: true,
    },

    ambulanceNumber: {
      type: String,
      trim: true,
      unique: true,
    },

    licenseNumber: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "pending", "blocked"],
      default: "pending",
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    heading: {
      type: Number,
      default: 0,
    },

    totalRides: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ambulanceDriverSchema.index({ location: "2dsphere" });

ambulanceDriverSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;

  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const m = today.getMonth() - this.dateOfBirth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }

  return age;
});

ambulanceDriverSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.joinDate = ret.createdAt
      ? ret.createdAt.toISOString().split("T")[0]
      : null;

    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;

    return ret;
  },
});

module.exports = mongoose.model("AmbulanceDriver", ambulanceDriverSchema);