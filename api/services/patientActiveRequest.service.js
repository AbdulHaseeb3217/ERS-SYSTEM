// api/services/patientActiveRequest.service.js

const AmbulanceRequest = require("../models/ambulanceRequest.model");
const BikeRide = require("../models/bikeRide.model");
const MedicineOrder = require("../models/medicineOrder.model");

const ACTIVE_AMBULANCE_STATUSES = [
  "pending",
  "accepted",
  "in-progress",
  "arrived_at_patient",
  "navigating_to_hospital",
  "payment_pending",
];

const ACTIVE_BIKE_RIDE_STATUSES = [
  "pending",
  "accepted",
  "arrived_at_pickup",
  "arrived_at_patient",
  "in_progress",
  "navigating_to_hospital",
  "payment_pending",
];

const ACTIVE_MEDICINE_STATUSES = [
  "pharmacy_processing",
  "dispatching",
  "delivering",
  "reached_pharmacy",
  "navigating_to_patient",
  "payment_pending",
];

const checkPatientActiveRequest = async (patientId) => {
  if (!patientId) {
    throw new Error("patientId is required");
  }

  const ambulanceRequest = await AmbulanceRequest.findOne({
    patient: patientId,
    status: { $in: ACTIVE_AMBULANCE_STATUSES },
  })
    .sort({ updatedAt: -1, requestedAt: -1, createdAt: -1 })
    .lean();

  if (ambulanceRequest) {
    return {
      exists: true,
      kind: "ambulance",
      status: ambulanceRequest.status,
      request: ambulanceRequest,
      message:
        "Your ambulance request is already active. Please complete or cancel it first.",
    };
  }

  const bikeRide = await BikeRide.findOne({
    patient: patientId,
    status: { $in: ACTIVE_BIKE_RIDE_STATUSES },
  })
    .sort({ updatedAt: -1, requestedAt: -1, createdAt: -1 })
    .lean();

  if (bikeRide) {
    return {
      exists: true,
      kind: "bike_ride",
      status: bikeRide.status,
      request: bikeRide,
      message:
        "Your bike ride request is already active. Please complete or cancel it first.",
    };
  }

  const medicineOrder = await MedicineOrder.findOne({
    patient: patientId,
    status: { $in: ACTIVE_MEDICINE_STATUSES },
  })
    .sort({ updatedAt: -1, requestedAt: -1, createdAt: -1 })
    .lean();

  if (medicineOrder) {
    return {
      exists: true,
      kind: "medicine_order",
      status: medicineOrder.status,
      request: medicineOrder,
      message:
        "Your medicine request is already active. Please complete or cancel it first.",
    };
  }

  return {
    exists: false,
    kind: null,
    status: null,
    request: null,
    message: null,
  };
};

const throwIfPatientHasActiveRequest = async (patientId) => {
  const active = await checkPatientActiveRequest(patientId);

  if (active.exists) {
    const err = new Error(
      active.message ||
        "You already have an active request. Please complete or cancel it first."
    );

    err.code = "ACTIVE_REQUEST_EXISTS";
    err.statusCode = 409;
    err.activeRequest = active;

    throw err;
  }

  return false;
};

module.exports = {
  ACTIVE_AMBULANCE_STATUSES,
  ACTIVE_BIKE_RIDE_STATUSES,
  ACTIVE_MEDICINE_STATUSES,
  checkPatientActiveRequest,
  throwIfPatientHasActiveRequest,
};