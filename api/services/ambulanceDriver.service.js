// api/services/ambulanceDriver.service.js

const bcrypt = require("bcryptjs");
const AmbulanceDriver = require("../models/ambulanceDriver.model");
const adminNotificationService = require("./adminNotification.service");

const registerAmbulanceDriver = async (data) => {
  const {
    fullName,
    phone,
    email,
    cnic,
    cnicImageUrl,
    licenseNumber,
    ambulanceNumber,
    dateOfBirth,
    address,
    vehicleType,
    password,
  } = data;

  if (
    !fullName ||
    !phone ||
    !email ||
    !cnic ||
    !cnicImageUrl ||
    !licenseNumber ||
    !ambulanceNumber ||
    !dateOfBirth ||
    !address ||
    !password
  ) {
    throw new Error("All required fields must be filled.");
  }

  if (typeof cnicImageUrl !== "string") {
    throw new Error("CNIC image is required.");
  }

  if (!cnicImageUrl.startsWith("data:image/")) {
    throw new Error("Invalid CNIC image format.");
  }

  const emailClean = String(email).toLowerCase().trim();
  const phoneClean = String(phone).trim();
  const ambClean = String(ambulanceNumber).trim();

  const existsEmail = await AmbulanceDriver.findOne({ email: emailClean });

  if (existsEmail) {
    throw new Error("Email already exists. Please use another email.");
  }

  const existsPhone = await AmbulanceDriver.findOne({ phone: phoneClean });

  if (existsPhone) {
    throw new Error("Phone already exists. Please use another phone number.");
  }

  const existsAmb = await AmbulanceDriver.findOne({
    ambulanceNumber: ambClean,
  });

  if (existsAmb) {
    throw new Error("Ambulance number already exists.");
  }

  if (String(password).length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const dob = new Date(dateOfBirth);

  if (isNaN(dob.getTime())) {
    throw new Error("Invalid dateOfBirth format, expected YYYY-MM-DD");
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  const last = await AmbulanceDriver.findOne().sort({ createdAt: -1 }).lean();

  let seq = 1;

  if (last?.driverId) {
    const m = String(last.driverId).match(/AD-(\d+)/);

    if (m) {
      seq = parseInt(m[1], 10) + 1;
    }
  }

  const driverId = `AD-${String(seq).padStart(3, "0")}`;

  const doc = await AmbulanceDriver.create({
    fullName: String(fullName).trim(),
    phone: phoneClean,
    email: emailClean,
    cnic: String(cnic).trim(),
    cnicImageUrl: String(cnicImageUrl).trim(),
    licenseNumber: String(licenseNumber).trim(),
    ambulanceNumber: ambClean,
    dateOfBirth: dob,
    address: String(address).trim(),
    vehicleType: vehicleType ? String(vehicleType).trim() : "Ambulance",
    passwordHash,
    driverId,
    status: "pending",
  });

  await adminNotificationService.safelyCreateAmbulanceDriverRegistrationNotification(
    doc
  );

  return doc.toJSON();
};

const loginAmbulanceDriver = async ({ phone, password }) => {
  if (!phone || !password) {
    return {
      success: false,
      message: "Phone and password are required",
    };
  }

  const driver = await AmbulanceDriver.findOne({
    phone: String(phone).trim(),
  });

  if (!driver) {
    return {
      success: false,
      message: "Driver not found",
    };
  }

  const ok = await bcrypt.compare(String(password), driver.passwordHash);

  if (!ok) {
    return {
      success: false,
      message: "Invalid password",
    };
  }

  if (driver.status === "blocked") {
    return {
      success: false,
      message:
        "The admin has blocked your status. You cannot log in. Contact the admin for more information.",
    };
  }

  if (driver.status === "pending") {
    return {
      success: false,
      message:
        "Your account is currently pending. You cannot log in until someone approves your request.",
    };
  }

  if (driver.status !== "active") {
    return {
      success: false,
      message: "Your account is not active now please contact admin",
    };
  }

  return {
    success: true,
    message: "Login successful",
    driver: driver.toJSON(),
  };
};

const getAmbulanceDriverProfile = async ({ id }) => {
  if (!id) {
    throw new Error("Driver id is required");
  }

  const driver = await AmbulanceDriver.findById(id);

  if (!driver) {
    throw new Error("Driver not found");
  }

  return driver.toJSON();
};

const updateAmbulanceDriverProfile = async ({ id, updates }) => {
  if (!id) {
    throw new Error("Driver id is required");
  }

  const blocked = [
    "email",
    "cnic",
    "cnicImageUrl",
    "licenseNumber",
    "passwordHash",
    "driverId",
    "status",
  ];

  blocked.forEach((k) => {
    if (updates?.[k] !== undefined) {
      delete updates[k];
    }
  });

  if (updates.fullName !== undefined) {
    updates.fullName = String(updates.fullName).trim();
  }

  if (updates.phone !== undefined) {
    updates.phone = String(updates.phone).trim();
  }

  if (updates.ambulanceNumber !== undefined) {
    updates.ambulanceNumber = String(updates.ambulanceNumber).trim();
  }

  if (updates.address !== undefined) {
    updates.address = String(updates.address).trim();
  }

  if (updates.vehicleType !== undefined) {
    updates.vehicleType = String(updates.vehicleType).trim();
  }

  if (updates.dateOfBirth !== undefined) {
    const dob = new Date(updates.dateOfBirth);

    if (isNaN(dob.getTime())) {
      throw new Error("Invalid dateOfBirth format, expected YYYY-MM-DD");
    }

    updates.dateOfBirth = dob;
  }

  if (updates.phone) {
    const existsPhone = await AmbulanceDriver.findOne({
      phone: updates.phone,
      _id: { $ne: id },
    });

    if (existsPhone) {
      throw new Error("Phone already exists. Please use another phone number.");
    }
  }

  if (updates.ambulanceNumber) {
    const existsAmb = await AmbulanceDriver.findOne({
      ambulanceNumber: updates.ambulanceNumber,
      _id: { $ne: id },
    });

    if (existsAmb) {
      throw new Error("Ambulance number already exists.");
    }
  }

  const driver = await AmbulanceDriver.findByIdAndUpdate(id, updates, {
    new: true,
  });

  if (!driver) {
    throw new Error("Driver not found");
  }

  return driver.toJSON();
};

const updateDriverCoordinates = async ({ driverId, lat, lng, heading }) => {
  if (!driverId) {
    throw new Error("driverId is required");
  }

  const updatedDriver = await AmbulanceDriver.findByIdAndUpdate(
    driverId,
    {
      $set: {
        "location.coordinates": [lng, lat],
        heading: heading || 0,
        isOnline: true,
      },
    },
    { new: true }
  );

  if (!updatedDriver) {
    throw new Error("Driver not found");
  }

  return updatedDriver.toJSON();
};

const forgotPasswordAmbulanceDriver = async ({ email }) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const driver = await AmbulanceDriver.findOne({
    email: String(email).toLowerCase().trim(),
  });

  if (!driver) {
    return {
      success: false,
      message: "Email not found",
    };
  }

  return {
    success: true,
    message: "Email verified. You can reset password now.",
  };
};

const resetPasswordAmbulanceDriver = async ({ email, newPassword }) => {
  if (!email || !newPassword) {
    throw new Error("Email and newPassword are required");
  }

  if (String(newPassword).length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const driver = await AmbulanceDriver.findOne({
    email: String(email).toLowerCase().trim(),
  });

  if (!driver) {
    throw new Error("Email not found");
  }

  driver.passwordHash = await bcrypt.hash(String(newPassword), 10);

  await driver.save();

  return {
    success: true,
    message: "Password reset successful",
  };
};

module.exports = {
  registerAmbulanceDriver,
  loginAmbulanceDriver,
  forgotPasswordAmbulanceDriver,
  resetPasswordAmbulanceDriver,
  getAmbulanceDriverProfile,
  updateAmbulanceDriverProfile,
  updateDriverCoordinates,
};