// api/services/bikeRider.service.js

const BikeRider = require("../models/rider.model");
const bcrypt = require("bcryptjs");
const adminNotificationService = require("./adminNotification.service");

const createBikeRider = async (data) => {
  const {
    fullName,
    email,
    phone,
    cnic,
    cnicImageUrl,
    licenseNumber,
    bikeNumber,
    vehicleType,
    password,
    dateOfBirth,
    address,
  } = data;

  if (
    !fullName ||
    !email ||
    !phone ||
    !cnic ||
    !cnicImageUrl ||
    !licenseNumber ||
    !bikeNumber ||
    !vehicleType ||
    !password ||
    !dateOfBirth ||
    !address
  ) {
    throw new Error("Missing required bike rider fields");
  }

  if (typeof cnicImageUrl !== "string") {
    throw new Error("CNIC image is required.");
  }

  if (!cnicImageUrl.startsWith("data:image/")) {
    throw new Error("Invalid CNIC image format.");
  }

  const emailExists = await BikeRider.findOne({ email });
  if (emailExists) {
    throw new Error("Email is already registered");
  }

  const phoneExists = await BikeRider.findOne({ phone });
  if (phoneExists) {
    throw new Error("Phone number is already registered");
  }

  const cnicExists = await BikeRider.findOne({ cnic });
  if (cnicExists) {
    throw new Error("CNIC is already registered");
  }

  const licenseExists = await BikeRider.findOne({ licenseNumber });
  if (licenseExists) {
    throw new Error("License number is already registered");
  }

  const bikeExists = await BikeRider.findOne({ bikeNumber });
  if (bikeExists) {
    throw new Error("Bike number is already registered");
  }

  const dobDate = new Date(dateOfBirth);
  if (isNaN(dobDate.getTime())) {
    throw new Error("Invalid dateOfBirth format, expected YYYY-MM-DD");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let riderId = "B10001";

  const lastRider = await BikeRider.findOne(
    { riderId: { $regex: /^B\d+$/ } },
    {},
    { sort: { createdAt: -1 } }
  );

  if (lastRider && lastRider.riderId) {
    const lastNum = parseInt(lastRider.riderId.replace(/\D/g, ""), 10);

    if (!Number.isNaN(lastNum)) {
      riderId = `B${lastNum + 1}`;
    }
  }

  const riderData = {
    fullName,
    email,
    phone,
    cnic,
    cnicImageUrl,
    licenseNumber,
    bikeNumber,
    vehicleType,
    passwordHash,
    dateOfBirth: dobDate,
    address,
    riderId,
    status: "pending",
  };

  const rider = await BikeRider.create(riderData);

  await adminNotificationService.safelyCreateBikeRiderRegistrationNotification(
    rider
  );

  return rider;
};

const bikeRiderLogin = async ({ phone, password }) => {
  if (!phone || !password) {
    return {
      success: false,
      message: "Phone and password are required",
    };
  }

  const rider = await BikeRider.findOne({ phone });

  if (!rider) {
    return {
      success: false,
      message: "Bike rider not found",
    };
  }

  const isMatch = await bcrypt.compare(password, rider.passwordHash);

  if (!isMatch) {
    return {
      success: false,
      message: "Invalid password",
    };
  }

  if (rider.status === "blocked") {
    return {
      success: false,
      message:
        "The admin has blocked your status. You cannot log in. Contact the admin for more information.",
    };
  }

  if (rider.status === "pending") {
    return {
      success: false,
      message:
        "Your account is currently pending. You cannot log in until admin approves your request.",
    };
  }

  if (rider.status !== "active") {
    return {
      success: false,
      message: "Your account is not active now please contact admin.",
    };
  }

  return {
    success: true,
    message: "Login successful",
    rider,
  };
};

const requestPasswordReset = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const rider = await BikeRider.findOne({ email });

  if (!rider) {
    return {
      success: false,
      message: "No rider found with this email",
    };
  }

  return {
    success: true,
    message: "Email found. Proceed to reset password.",
    riderId: rider._id,
  };
};

const resetPassword = async ({ email, newPassword }) => {
  if (!email || !newPassword) {
    throw new Error("Email and new password are required");
  }

  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const rider = await BikeRider.findOne({ email });

  if (!rider) {
    throw new Error("No rider found with this email");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  rider.passwordHash = passwordHash;

  await rider.save();

  return {
    success: true,
    message: "Password updated successfully",
  };
};

const getBikeRiderProfile = async (id) => {
  const rider = await BikeRider.findById(id);

  if (!rider) {
    throw new Error("Bike rider not found");
  }

  return rider;
};

const updateBikeRiderProfile = async (id, updates) => {
  const rider = await BikeRider.findById(id);

  if (!rider) {
    throw new Error("Bike rider not found");
  }

  const {
    fullName,
    phone,
    address,
    bikeNumber,
    vehicleType,
    licenseNumber,
    dateOfBirth,
  } = updates;

  if (phone && phone !== rider.phone) {
    const exists = await BikeRider.findOne({ phone });

    if (exists) {
      throw new Error("Phone number is already registered");
    }

    rider.phone = phone;
  }

  if (bikeNumber && bikeNumber !== rider.bikeNumber) {
    const exists = await BikeRider.findOne({ bikeNumber });

    if (exists) {
      throw new Error("Bike number is already registered");
    }

    rider.bikeNumber = bikeNumber;
  }

  if (licenseNumber && licenseNumber !== rider.licenseNumber) {
    const exists = await BikeRider.findOne({ licenseNumber });

    if (exists) {
      throw new Error("License number is already registered");
    }

    rider.licenseNumber = licenseNumber;
  }

  if (typeof fullName === "string") rider.fullName = fullName;
  if (typeof address === "string") rider.address = address;
  if (typeof vehicleType === "string") rider.vehicleType = vehicleType;

  if (dateOfBirth) {
    const dobDate = new Date(dateOfBirth);

    if (isNaN(dobDate.getTime())) {
      throw new Error("Invalid dateOfBirth format, expected YYYY-MM-DD");
    }

    rider.dateOfBirth = dobDate;
  }

  await rider.save();

  return rider;
};

module.exports = {
  createBikeRider,
  bikeRiderLogin,
  requestPasswordReset,
  resetPassword,
  getBikeRiderProfile,
  updateBikeRiderProfile,
};