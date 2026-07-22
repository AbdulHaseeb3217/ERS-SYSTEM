const patientService = require("../services/patient.service");
const mongoose = require("mongoose");

const Patient = require("../models/patient.model");
const BikeRide = require("../models/bikeRide.model");
const MedicineOrder = require("../models/medicineOrder.model");

const createPatient = async (req, res) => {
  try {
    const patient = await patientService.createPatient(req.body);

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient,
    });
  } catch (error) {
    console.error("❌ Error in createPatient():", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `${field} already registered`,
        type: "DUPLICATE_DB",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Error in createPatient()",
      type: "SERVICE_ERROR",
    });
  }
};

const Patientlogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number and password are required",
      });
    }

    const result = await patientService.Patientlogin({ phone, password });

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      patient: result.patient,
    });
  } catch (error) {
    console.error("❌ Error in Patientlogin():", error);
    return res.status(500).json({
      success: false,
      message: "Error in Patientlogin()",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await patientService.verifyEmailForReset(email);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified. You can reset your password now.",
    });
  } catch (error) {
    console.error("❌ Error in forgotPassword():", error);
    return res.status(500).json({
      success: false,
      message: "Error in forgotPassword()",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and newPassword are required",
      });
    }

    const result = await patientService.resetPasswordByEmail({
      email,
      newPassword,
    });

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("❌ Error in resetPassword():", error);
    return res.status(500).json({
      success: false,
      message: "Error in resetPassword()",
      error: error.message,
    });
  }
};

const updatePatientProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedPatient = await patientService.updatePatientProfile(
      id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      patient: updatedPatient,
    });
  } catch (error) {
    console.error("❌ Error in updatePatientProfile():", error);

    if (error.message === "Patient not found") {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `${field} already registered`,
        type: "DUPLICATE_DB",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Error in updatePatientProfile()",
      type: "SERVICE_ERROR",
    });
  }
};

const getPatientProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const patient = await patientService.getPatientById(id);

    return res.status(200).json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error("❌ Error in getPatientProfile():", error);

    if (error.message === "Patient not found") {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error in getPatientProfile()",
      error: error.message,
    });
  }
};

/* =====================================================
   PATIENT HISTORY HELPERS
===================================================== */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const statusRegex = (value) => new RegExp(`^\\s*${value}\\s*$`, "i");

const formatMoney = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Rs. 0";
  return `Rs. ${n.toLocaleString("en-PK")}`;
};

const getAddress = (location, fallback = "N/A") => {
  if (!location) return fallback;
  if (typeof location === "string") return location || fallback;
  return location.address || location.name || fallback;
};

const getDateValue = (obj = {}) => {
  return (
    obj.completedAt ||
    obj.deliveredAt ||
    obj.cancelledAt ||
    obj.updatedAt ||
    obj.requestedAt ||
    obj.createdAt ||
    null
  );
};

const buildPatientMatch = async (patientId) => {
  const idText = String(patientId || "").trim();
  const or = [];

  if (!idText) return [];

  if (isValidObjectId(idText)) {
    const objectId = new mongoose.Types.ObjectId(idText);
    or.push({ patient: objectId });
    or.push({ patientId: objectId });
    or.push({ customerId: objectId });
  }

  or.push({ patientId: idText });
  or.push({ patientCode: idText });

  let patient = null;

  if (isValidObjectId(idText)) {
    patient = await Patient.findById(idText).lean();
  }

  if (patient) {
    const phone = patient.phone || patient.phoneNumber || "";
    const name = patient.name || patient.fullName || "";
    const email = patient.email || "";

    if (phone) {
      or.push({ "patientInfo.phone": phone });
      or.push({ patientPhone: phone });
      or.push({ phone });
    }

    if (name) {
      or.push({ "patientInfo.name": name });
      or.push({ patientName: name });
      or.push({ name });
    }

    if (email) {
      or.push({ patientEmail: email });
      or.push({ email });
    }
  }

  return or;
};

const makeMedicineItemsText = (order = {}) => {
  const items = [];

  const pushItem = (item) => {
    if (!item) return;

    if (typeof item === "string") {
      const clean = item.trim();
      if (clean) items.push(clean);
      return;
    }

    const name =
      item.name ||
      item.medicineName ||
      item.equipmentName ||
      item.title ||
      item.label;

    if (name) items.push(String(name).trim());
  };

  if (Array.isArray(order.medicineItems)) order.medicineItems.forEach(pushItem);
  if (Array.isArray(order.equipmentItems)) order.equipmentItems.forEach(pushItem);
  if (Array.isArray(order.items)) order.items.forEach(pushItem);

  return items.filter(Boolean).join(", ") || "Medicine / Equipment";
};

/* =====================================================
   BIKE RIDE HISTORY
===================================================== */

const getPatientBikeRideHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const or = await buildPatientMatch(id);

    if (!or.length) {
      return res.status(400).json({
        success: false,
        message: "Patient id is required",
      });
    }

    const historyStatuses = [
      "completed",
      "cancelled",
      "canceled",
      "payment_pending",
      "in_progress",
      "navigating_to_hospital",
      "accepted",
    ];

    const rides = await BikeRide.find({
      $or: or,
      status: { $in: historyStatuses.map(statusRegex) },
    })
      .populate("rider", "fullName name phone bikeNumber bikeNo")
      .sort({
        completedAt: -1,
        cancelledAt: -1,
        updatedAt: -1,
        requestedAt: -1,
        createdAt: -1,
      })
      .limit(100)
      .lean();

    const formatted = rides.map((ride) => ({
      id: String(ride._id || ride.id || ""),
      rideCode:
        ride.rideCode ||
        ride.orderCode ||
        `BIKE-${String(ride._id || "").slice(-4).toUpperCase()}`,

      riderName:
        ride.riderInfo?.name ||
        ride.rider?.fullName ||
        ride.rider?.name ||
        "Unknown Rider",

      riderPhone: ride.riderInfo?.phone || ride.rider?.phone || "N/A",

      bikeNumber:
        ride.riderInfo?.bikeNumber ||
        ride.rider?.bikeNumber ||
        ride.rider?.bikeNo ||
        "N/A",

      pickupLocation: getAddress(ride.pickupLocation, "N/A"),
      dropoffLocation: getAddress(ride.dropoffLocation, "N/A"),

      requestedAt: ride.requestedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      dateTime: getDateValue(ride),

      fareAmount: Number(ride.fareAmount || 0),
      fare: formatMoney(ride.fareAmount || 0),

      paymentStatus: ride.paymentStatus || "unpaid",
      status: ride.status || "completed",
    }));

    return res.status(200).json({
      success: true,
      rides: formatted,
    });
  } catch (error) {
    console.error("❌ Error in getPatientBikeRideHistory():", error);
    return res.status(500).json({
      success: false,
      message: "Bike ride history fetch karne mein masla hua",
      error: error.message,
    });
  }
};

/* =====================================================
   MEDICINE ORDER HISTORY
===================================================== */

const getPatientMedicineOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const or = await buildPatientMatch(id);

    if (!or.length) {
      return res.status(400).json({
        success: false,
        message: "Patient id is required",
      });
    }

    const orders = await MedicineOrder.find({
      $or: or,
    })
      .populate("pharmacy", "pharmacyName name phone address")
      .populate("rider", "fullName name phone bikeNumber bikeNo")
      .sort({
        deliveredAt: -1,
        cancelledAt: -1,
        updatedAt: -1,
        requestedAt: -1,
        createdAt: -1,
      })
      .limit(100)
      .lean();

    const formatted = orders.map((order) => ({
      id: String(order._id || order.id || ""),
      orderCode:
        order.orderCode ||
        `MED-${String(order._id || "").slice(-4).toUpperCase()}`,

      pharmacyName:
        order.pharmacyInfo?.name ||
        order.pharmacy?.pharmacyName ||
        order.pharmacy?.name ||
        "Unknown Pharmacy",

      pharmacyPhone:
        order.pharmacyInfo?.phone || order.pharmacy?.phone || "N/A",

      deliveredBy:
        order.riderInfo?.name ||
        order.rider?.fullName ||
        order.rider?.name ||
        "Not assigned yet",

      riderPhone: order.riderInfo?.phone || order.rider?.phone || "N/A",

      bikeNumber:
        order.riderInfo?.bikeNumber ||
        order.rider?.bikeNumber ||
        order.rider?.bikeNo ||
        "N/A",

      items: makeMedicineItemsText(order),
      medicineItems: Array.isArray(order.medicineItems)
        ? order.medicineItems
        : [],
      equipmentItems: Array.isArray(order.equipmentItems)
        ? order.equipmentItems
        : [],

      deliveryAddress: getAddress(order.deliveryLocation, "N/A"),

      requestedAt: order.requestedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      dateTime: getDateValue(order),

      amountRaw: Number(order.amount || 0),
      amount: formatMoney(order.amount || 0),

      paymentStatus: order.paymentStatus || "unpaid",
      status: order.status || "pharmacy_processing",
    }));

    return res.status(200).json({
      success: true,
      orders: formatted,
    });
  } catch (error) {
    console.error("❌ Error in getPatientMedicineOrderHistory():", error);
    return res.status(500).json({
      success: false,
      message: "Medicine order history fetch karne mein masla hua",
      error: error.message,
    });
  }
};

const getPatientServiceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const or = await buildPatientMatch(id);

    if (!or.length) {
      return res.status(400).json({
        success: false,
        message: "Patient id is required",
      });
    }

    const [bikeRides, medicineOrders] = await Promise.all([
      BikeRide.find({ $or: or })
        .populate("rider", "fullName name phone bikeNumber bikeNo")
        .sort({ updatedAt: -1, requestedAt: -1, createdAt: -1 })
        .limit(100)
        .lean(),

      MedicineOrder.find({ $or: or })
        .populate("pharmacy", "pharmacyName name phone address")
        .populate("rider", "fullName name phone bikeNumber bikeNo")
        .sort({ updatedAt: -1, requestedAt: -1, createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      bikeRides,
      medicineOrders,
    });
  } catch (error) {
    console.error("❌ Error in getPatientServiceHistory():", error);
    return res.status(500).json({
      success: false,
      message: "Service history fetch karne mein masla hua",
      error: error.message,
    });
  }
};

module.exports = {
  createPatient,
  Patientlogin,
  forgotPassword,
  resetPassword,
  updatePatientProfile,
  getPatientProfile,

  getPatientBikeRideHistory,
  getPatientMedicineOrderHistory,
  getPatientServiceHistory,
};