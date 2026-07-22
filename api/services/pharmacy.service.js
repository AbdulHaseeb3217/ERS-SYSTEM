const Pharmacy = require("../models/pharmacy.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Order = require("../models/medicineOrder.model");

const generatePharmacyId = () => `PH-${Date.now()}`;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isValidLngLat = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return false;

  const lng = toNumber(coords[0]);
  const lat = toNumber(coords[1]);

  if (lng === null || lat === null) return false;
  if (lng === 0 && lat === 0) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat < -90 || lat > 90) return false;

  return true;
};

const normalizePointLocation = (location) => {
  const coords = location?.coordinates;
  if (!isValidLngLat(coords)) return null;

  return {
    type: "Point",
    coordinates: [toNumber(coords[0]), toNumber(coords[1])],
  };
};

const calculateDistanceKm = (fromCoords, toCoords) => {
  if (!isValidLngLat(fromCoords) || !isValidLngLat(toCoords)) return null;

  const lng1 = toNumber(fromCoords[0]);
  const lat1 = toNumber(fromCoords[1]);
  const lng2 = toNumber(toCoords[0]);
  const lat2 = toNumber(toCoords[1]);

  const R = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatDistanceText = (distanceKm) => {
  if (distanceKm == null) return "Distance unavailable";
  if (distanceKm < 1) return `${Math.max(distanceKm * 1000, 0).toFixed(0)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
};

const registerPharmacy = async (data) => {
  const {
    pharmacyName,
    email,
    password,
    contactNumber,
    licenseId,
    address,
    location,
  } = data;

  const normalizedLocation = normalizePointLocation(location);

  if (!address || !String(address).trim() || !normalizedLocation) {
    throw new Error("Valid pharmacy location is required.");
  }

  const existingPharmacy = await Pharmacy.findOne({
    $or: [{ email }, { phone: contactNumber }, { licenseNumber: licenseId }],
  });

  if (existingPharmacy) {
    throw new Error(
      "Pharmacy with this email, contact number, or license ID already exists."
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const uniqueId = generatePharmacyId();

  const newPharmacy = new Pharmacy({
    pharmacyName,
    email,
    passwordHash: hashedPassword,
    phone: contactNumber,
    licenseNumber: licenseId,
    address: String(address).trim(),
    location: normalizedLocation,
    pharmacyId: uniqueId,
    operatingHours: "24/7",
    status: "pending",
    isOnline: false,
  });

  const savedPharmacy = await newPharmacy.save();
  const token = jwt.sign(
    { id: savedPharmacy._id, role: "pharmacy" },
    process.env.JWT_SECRET || "secret_key",
    { expiresIn: "30d" }
  );

  return { pharmacy: savedPharmacy, token };
};

const loginPharmacy = async (email, password) => {
  const pharmacy = await Pharmacy.findOne({ email });
  if (!pharmacy) throw new Error("Invalid email or password");

  const isMatch = await bcrypt.compare(password, pharmacy.passwordHash);
  if (!isMatch) throw new Error("Invalid email or password");

  if (pharmacy.status === "pending") {
    throw new Error(
      "Your pharmacy verification is pending now kindly wait for admin approval."
    );
  }

  if (pharmacy.status === "blocked") {
    throw new Error(
      "Your account has been block now kindly contact admin for further discussion regarding this issue."
    );
  }

  const token = jwt.sign(
    { id: pharmacy._id, role: "pharmacy" },
    process.env.JWT_SECRET || "secret_key",
    { expiresIn: "30d" }
  );

  return { pharmacy, token };
};

const verifyPharmacyEmail = async (email) => {
  const pharmacy = await Pharmacy.findOne({ email });
  if (!pharmacy) throw new Error("Email not found");
  return { message: "Email verified" };
};

const resetPharmacyPassword = async (email, newPassword) => {
  const pharmacy = await Pharmacy.findOne({ email });
  if (!pharmacy) throw new Error("Pharmacy not found");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  pharmacy.passwordHash = hashedPassword;
  await pharmacy.save();

  return { message: "Password updated successfully" };
};

const updatePharmacyProfile = async (id, data) => {
  if (data.contactNumber) {
    const existing = await Pharmacy.findOne({
      phone: data.contactNumber,
      _id: { $ne: id },
    });

    if (existing) throw new Error("Contact number is already in use");
  }

  const updates = {
    pharmacyName: data.pharmacyName,
    phone: data.contactNumber,
    operatingHours: data.operatingHours,
  };

  if (data.address !== undefined) {
    const normalizedLocation = normalizePointLocation(data.location);

    if (!String(data.address || "").trim() || !normalizedLocation) {
      throw new Error("Valid pharmacy location is required.");
    }

    updates.address = String(data.address).trim();
    updates.location = normalizedLocation;
  }

  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) delete updates[key];
  });

  const updatedPharmacy = await Pharmacy.findByIdAndUpdate(id, updates, {
    new: true,
  }).select("-passwordHash");

  if (!updatedPharmacy) throw new Error("Pharmacy not found");

  return updatedPharmacy;
};

const getPharmacyProfile = async (id) => {
  const pharmacy = await Pharmacy.findById(id).select("-passwordHash");
  if (!pharmacy) throw new Error("Pharmacy not found");
  return pharmacy;
};

const changePharmacyPassword = async (id, currentPassword, newPassword) => {
  const pharmacy = await Pharmacy.findById(id);
  if (!pharmacy) throw new Error("Pharmacy not found");

  const isMatch = await bcrypt.compare(currentPassword, pharmacy.passwordHash);
  if (!isMatch) throw new Error("Incorrect current password");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  pharmacy.passwordHash = hashedPassword;
  await pharmacy.save();

  return { message: "Password changed successfully" };
};

const getPharmacyStats = async (id) => {
  const pharmacy = await Pharmacy.findById(id);
  if (!pharmacy) throw new Error("Pharmacy not found");

  const stats = {
    pendingRequests: 0,
    completedToday: 0,
    totalOrders: 0,
    isOnline: pharmacy.isOnline,
  };

  if (Order) {
    try {
      stats.pendingRequests = await Order.countDocuments({
        status: { $in: ["pharmacy_processing", "pending"] },
        $or: [{ pharmacy: null }, { pharmacy: { $exists: false } }],
        ignoredBy: { $ne: pharmacy._id },
      });

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      stats.completedToday = await Order.countDocuments({
        pharmacy: id,
        status: { $in: ["delivered", "completed"] },
        createdAt: { $gte: startOfDay },
      });

      stats.totalOrders = await Order.countDocuments({ pharmacy: id });
    } catch (err) {
      console.error("Stats calculation error:", err);
    }
  }

  return stats;
};

const toggleOnlineStatus = async (id) => {
  const pharmacy = await Pharmacy.findById(id);
  if (!pharmacy) throw new Error("Pharmacy not found");

  if (pharmacy.status !== "active") {
    throw new Error("Your status is not active right now we can't toggle your status.");
  }

  pharmacy.isOnline = !pharmacy.isOnline;
  await pharmacy.save();

  return { isOnline: pharmacy.isOnline };
};

const getPendingRequests = async (pharmacyId) => {
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) throw new Error("Pharmacy not found");

  if (pharmacy.status !== "active") return [];

  const requests = await Order.find({
    status: { $in: ["pharmacy_processing", "pending"] },
    $or: [{ pharmacy: null }, { pharmacy: { $exists: false } }],
    ignoredBy: { $ne: pharmacy._id },
  })
    .populate("patient", "fullName phone")
    .sort({ requestedAt: -1 });

  const pharmacyCoords = pharmacy.location?.coordinates;

  return requests.map((orderDoc) => {
    const order = orderDoc.toJSON ? orderDoc.toJSON() : orderDoc;
    const patientCoords = order.deliveryLocation?.coordinates;
    const distanceKm = calculateDistanceKm(patientCoords, pharmacyCoords);

    return {
      ...order,
      distanceKm,
      distanceText: formatDistanceText(distanceKm),
    };
  });
};

const ignoreRequest = async (pharmacyId, orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const alreadyIgnored = order.ignoredBy.some(
    (id) => String(id) === String(pharmacyId)
  );

  if (!alreadyIgnored) {
    order.ignoredBy.push(pharmacyId);
    await order.save();
  }

  return { success: true, message: "Order ignored for this pharmacy" };
};

const approveAndDispatchRequest = async (
  pharmacyId,
  orderId,
  pricing = {}
) => {
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) throw new Error("Pharmacy not found");
  if (pharmacy.status !== "active") {
    throw new Error("Your pharmacy is not active right now.");
  }

  if (!isValidLngLat(pharmacy.location?.coordinates)) {
    throw new Error("Valid pharmacy location is required before dispatch.");
  }

  const order = await Order.findOne({
    _id: orderId,
    status: { $in: ["pharmacy_processing", "pending"] },
    $or: [{ pharmacy: null }, { pharmacy: { $exists: false } }],
  });

  if (!order) {
    throw new Error("This prescription request has already been approved by another pharmacy.");
  }

  order.pharmacy = pharmacy._id;
  order.pharmacyInfo = {
    name: pharmacy.pharmacyName || "",
    phone: pharmacy.phone || "",
    address: pharmacy.address || "",
  };
  // NEW: Save price breakdown entered by pharmacy
  const medicineAmount = Number(pricing.medicineAmount || 0);
  const equipmentAmount = Number(pricing.equipmentAmount || 0);
  const deliveryCharges = 0;

  order.pricing = {
    medicineAmount,
    equipmentAmount,
    deliveryCharges,
    totalAmount:
      medicineAmount +
      equipmentAmount +
      deliveryCharges,
  };

  // Delivery charge will be calculated separately for each rider at request/accept time.
  order.riderEarning = 0;

  // Keep existing dispatch flow same
  order.status = "dispatching";
  order.approvedAt = new Date();

  await order.save();

  return await Order.findById(order._id)
    .populate("patient", "fullName phone address location")
    .populate("pharmacy", "pharmacyName phone address location");
};

module.exports = {
  registerPharmacy,
  loginPharmacy,
  verifyPharmacyEmail,
  resetPharmacyPassword,
  updatePharmacyProfile,
  getPharmacyProfile,
  changePharmacyPassword,
  getPharmacyStats,
  toggleOnlineStatus,
  getPendingRequests,
  approveAndDispatchRequest,
  ignoreRequest,
};
