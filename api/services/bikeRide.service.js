// api/services/bikeRide.service.js

const mongoose = require("mongoose");
const BikeRide = require("../models/bikeRide.model");
const Patient = require("../models/patient.model");
const Rider = require("../models/rider.model");
const MedicineOrder = require("../models/medicineOrder.model");

const {
  throwIfPatientHasActiveRequest,
} = require("./patientActiveRequest.service");

const ACTIVE_BIKE_RIDE_STATUSES = [
  "pending",
  "accepted",
  "arrived_at_pickup",
  "arrived_at_patient",
  "in_progress",
  "navigating_to_hospital",
  "payment_pending",
];

const ACTIVE_RIDER_RIDE_STATUSES = [
  "accepted",
  "arrived_at_pickup",
  "arrived_at_patient",
  "in_progress",
  "navigating_to_hospital",
  "payment_pending",
];

const generateRideCode = async () => {
  const lastRide = await BikeRide.findOne({
    rideCode: { $regex: /^BR-\d+$/ },
  })
    .sort({ createdAt: -1 })
    .select("rideCode")
    .lean();

  let nextNumber = 1;

  if (lastRide?.rideCode) {
    const match = lastRide.rideCode.match(/^BR-(\d+)$/);

    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `BR-${String(nextNumber).padStart(3, "0")}`;
};

const normalizeLocation = (location, fallbackName) => {
  if (!location) {
    return null;
  }

  const lat =
    location.lat ??
    location.latitude ??
    location.coordinates?.[1] ??
    null;

  const lng =
    location.lng ??
    location.longitude ??
    location.coordinates?.[0] ??
    null;

  if (lat == null || lng == null) {
    return null;
  }

  return {
    name: location.name || location.displayName || fallbackName || "",
    address: location.address || fallbackName || "",
    coordinates: [Number(lng), Number(lat)],
  };
};

const getBikeRideById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ride id");
  }

  const ride = await BikeRide.findById(id)
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (!ride) {
    throw new Error("Ride not found");
  }

  return ride;
};

const getActivePatientBikeRide = async (patientId) => {
  if (!patientId) {
    throw new Error("patientId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient id");
  }

  const ride = await BikeRide.findOne({
    patient: patientId,
    status: { $in: [...ACTIVE_BIKE_RIDE_STATUSES, "completed"] },
  })
    .sort({ requestedAt: -1, updatedAt: -1 })
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  return ride;
};

const getActiveRiderBikeRide = async (riderId) => {
  if (!riderId) {
    throw new Error("riderId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(riderId)) {
    throw new Error("Invalid rider id");
  }

  const ride = await BikeRide.findOne({
    rider: riderId,
    status: { $in: ACTIVE_RIDER_RIDE_STATUSES },
  })
    .sort({ acceptedAt: -1, updatedAt: -1 })
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  return ride;
};

const createBikeRideRequest = async ({
  patientId,
  pickupText,
  dropoffText,
  pickupLocation,
  dropoffLocation,
}) => {
  if (!patientId) {
    throw new Error("patientId is required");
  }

  if (!pickupText || !dropoffText) {
    throw new Error("pickupText & dropoffText are required");
  }

  const normalizedPickup = normalizeLocation(pickupLocation, pickupText);
  const normalizedDropoff = normalizeLocation(dropoffLocation, dropoffText);

  if (!normalizedPickup) {
    throw new Error("pickupLocation.lat & pickupLocation.lng are required");
  }

  if (!normalizedDropoff) {
    throw new Error("dropoffLocation.lat & dropoffLocation.lng are required");
  }

  const patient = await Patient.findById(patientId);

  if (!patient) {
    throw new Error("Patient not found");
  }

  // ✅ NEW: ambulance / bike / medicine mein se koi bhi active request hogi to new request block hogi
  await throwIfPatientHasActiveRequest(patient._id);

  const activeRide = await BikeRide.findOne({
    patient: patient._id,
    status: { $in: ACTIVE_BIKE_RIDE_STATUSES },
  })
    .sort({ requestedAt: -1, updatedAt: -1 })
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (activeRide) {
    const err = new Error(
      "You already have an active bike ride request. Please complete or cancel it before creating a new request."
    );

    err.code = "ACTIVE_BIKE_RIDE_EXISTS";
    err.statusCode = 409;
    err.activeRide = activeRide;

    throw err;
  }

  patient.location = {
    type: "Point",
    coordinates: normalizedPickup.coordinates,
  };

  patient.totalBikeRides = (patient.totalBikeRides || 0) + 1;
  await patient.save();

  for (let attempt = 0; attempt < 3; attempt++) {
    const rideCode = await generateRideCode();

    const ridePayload = {
      patient: patient._id,
      rideCode,

      patientInfo: {
        name: patient.fullName || "",
        phone: patient.phone || "",
      },

      pickupLocation: normalizedPickup,
      dropoffLocation: normalizedDropoff,

      status: "pending",
      requestedAt: new Date(),
    };

    try {
      const rideDoc = await BikeRide.create(ridePayload);
      return rideDoc;
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.rideCode) {
        continue;
      }

      throw err;
    }
  }

  throw new Error("Could not generate unique rideCode. Please try again.");
};

const getPendingRideRequests = async () => {
  const list = await BikeRide.find({
    status: "pending",
    $or: [{ rider: { $exists: false } }, { rider: null }],
  })
    .sort({ requestedAt: -1 })
    .limit(50)
    .lean();

  return list;
};

const acceptBikeRideRequest = async ({ rideId, requestId, riderId }) => {
  const finalRideId = rideId || requestId;

  if (!finalRideId) {
    throw new Error("rideId or requestId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(finalRideId)) {
    throw new Error("Invalid ride id");
  }

  if (!mongoose.Types.ObjectId.isValid(riderId)) {
    throw new Error("Invalid rider id");
  }

  const rider = await Rider.findById(riderId).select(
    "fullName phone bikeNumber status isOnline location"
  );

  if (!rider) {
    throw new Error("Rider not found");
  }

  if (rider.status === "blocked") {
    throw new Error("Rider account is blocked");
  }

  const acceptedRide = await BikeRide.findOneAndUpdate(
    {
      _id: finalRideId,
      status: "pending",
      $or: [{ rider: { $exists: false } }, { rider: null }],
    },
    {
      $set: {
        rider: rider._id,

        riderInfo: {
          name: rider.fullName || "",
          phone: rider.phone || "",
          bikeNumber: rider.bikeNumber || "",
        },

        status: "accepted",
        acceptedAt: new Date(),
        autoAssigned: false,
      },
    },
    {
      new: true,
    }
  )
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (!acceptedRide) {
    const existingRide = await BikeRide.findById(finalRideId).select(
      "status rider rideCode"
    );

    if (!existingRide) {
      throw new Error("Ride not found");
    }

    if (existingRide.status === "accepted") {
      throw new Error("This ride request is already accepted by another rider");
    }

    if (existingRide.status === "pending" && existingRide.rider) {
      throw new Error("This ride request is already assigned to another rider");
    }

    throw new Error(
      `Ride request cannot be accepted because current status is ${existingRide.status}`
    );
  }

  return acceptedRide;
};

const updateBikeRideStatus = async ({
  rideId,
  requestId,
  riderId,
  status,
  cancelledBy,
}) => {
  const finalRideId = rideId || requestId;

  if (!finalRideId) {
    throw new Error("rideId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(finalRideId)) {
    throw new Error("Invalid ride id");
  }

  const allowedStatuses = [
    "accepted",
    "arrived_at_pickup",
    "arrived_at_patient",
    "in_progress",
    "navigating_to_hospital",
    "payment_pending",
    "completed",
    "cancelled",
    "no_rider",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid bike ride status");
  }

  const updatePayload = {
    status,
  };

  if (status === "arrived_at_pickup" || status === "arrived_at_patient") {
    updatePayload.pickupReachedAt = new Date();
  }

  if (status === "in_progress" || status === "navigating_to_hospital") {
    updatePayload.pickupReachedAt = updatePayload.pickupReachedAt || new Date();
  }

  if (status === "payment_pending") {
    updatePayload.dropoffReachedAt = new Date();
    updatePayload.paymentStatus = "unpaid";
  }

  if (status === "completed") {
    updatePayload.dropoffReachedAt =
      updatePayload.dropoffReachedAt || new Date();
    updatePayload.completedAt = new Date();
  }

  if (status === "cancelled") {
    updatePayload.cancelledAt = new Date();
    updatePayload.cancelledBy = cancelledBy || "rider";
  }

  const query = {
    _id: finalRideId,
  };

  if (riderId && mongoose.Types.ObjectId.isValid(riderId)) {
    query.rider = riderId;
  }

  const updatedRide = await BikeRide.findOneAndUpdate(
    query,
    {
      $set: updatePayload,
    },
    {
      new: true,
    }
  )
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (!updatedRide) {
    throw new Error("Ride not found or rider is not assigned to this ride");
  }

  return updatedRide;
};

const updateBikeRiderLiveLocation = async ({
  rideId,
  requestId,
  riderId,
  lat,
  lng,
  latitude,
  longitude,
}) => {
  const finalRideId = rideId || requestId;

  if (!finalRideId) {
    throw new Error("rideId is required");
  }

  if (!riderId) {
    throw new Error("riderId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(finalRideId)) {
    throw new Error("Invalid ride id");
  }

  if (!mongoose.Types.ObjectId.isValid(riderId)) {
    throw new Error("Invalid rider id");
  }

  const finalLat = lat ?? latitude;
  const finalLng = lng ?? longitude;

  if (finalLat == null || finalLng == null) {
    throw new Error("lat and lng are required");
  }

  const liveLocation = {
    name: "Bike Rider Current Location",
    address: "Bike Rider Current Location",
    coordinates: [Number(finalLng), Number(finalLat)],
  };

  await Rider.findByIdAndUpdate(riderId, {
    $set: {
      isOnline: true,
      location: {
        type: "Point",
        coordinates: liveLocation.coordinates,
      },
    },
  });

  const updatedRide = await BikeRide.findOneAndUpdate(
    {
      _id: finalRideId,
      rider: riderId,
      status: {
        $in: [
          "accepted",
          "arrived_at_pickup",
          "arrived_at_patient",
          "in_progress",
          "navigating_to_hospital",
          "payment_pending",
        ],
      },
    },
    {
      $set: {
        riderLiveLocation: liveLocation,
        riderLocationUpdatedAt: new Date(),
      },
    },
    {
      new: true,
    }
  )
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (!updatedRide) {
    throw new Error("Active accepted bike ride not found for this rider");
  }

  return updatedRide;
};

const markBikeRidePaymentPending = async ({ rideId, requestId, riderId }) => {
  const finalRideId = rideId || requestId;

  if (!finalRideId) {
    throw new Error("rideId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(finalRideId)) {
    throw new Error("Invalid ride id");
  }

  const query = { _id: finalRideId };

  if (riderId && mongoose.Types.ObjectId.isValid(riderId)) {
    query.rider = riderId;
  }

  const updatedRide = await BikeRide.findOneAndUpdate(
    query,
    {
      $set: {
        status: "payment_pending",
        dropoffReachedAt: new Date(),
        paymentStatus: "unpaid",
      },
    },
    { new: true }
  )
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (!updatedRide) {
    throw new Error("Ride not found or rider is not assigned to this ride");
  }

  return updatedRide;
};

const updateBikeRidePaymentAmount = async ({
  rideId,
  requestId,
  riderId,
  fareAmount,
}) => {
  const finalRideId = rideId || requestId;

  if (!finalRideId) {
    throw new Error("rideId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(finalRideId)) {
    throw new Error("Invalid ride id");
  }

  const amount = Number(fareAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Please enter a valid payment amount");
  }

  const query = { _id: finalRideId, status: "payment_pending" };

  if (riderId && mongoose.Types.ObjectId.isValid(riderId)) {
    query.rider = riderId;
  }

  const updatedRide = await BikeRide.findOneAndUpdate(
    query,
    {
      $set: {
        fareAmount: amount,
        paymentStatus: "unpaid",
      },
    },
    { new: true }
  )
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (!updatedRide) {
    throw new Error("Payment pending ride not found");
  }

  return updatedRide;
};

const confirmBikeRidePaymentReceived = async ({
  rideId,
  requestId,
  riderId,
}) => {
  const finalRideId = rideId || requestId;

  if (!finalRideId) {
    throw new Error("rideId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(finalRideId)) {
    throw new Error("Invalid ride id");
  }

  const query = { _id: finalRideId, status: "payment_pending" };

  if (riderId && mongoose.Types.ObjectId.isValid(riderId)) {
    query.rider = riderId;
  }

  const updatedRide = await BikeRide.findOneAndUpdate(
    query,
    {
      $set: {
        paymentStatus: "paid",
        status: "completed",
        completedAt: new Date(),
        dropoffReachedAt: new Date(),
      },
    },
    { new: true }
  )
    .populate("patient", "fullName phone")
    .populate("rider", "fullName phone bikeNumber location");

  if (!updatedRide) {
    throw new Error("Payment pending ride not found");
  }

  return updatedRide;
};

// =====================================================================
// ✅ NEW: Bike Rider Past History
// =====================================================================

const getPatientBikeRideHistory = async (patientId) => {
  if (!patientId) {
    throw new Error("patientId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    throw new Error("Invalid patient id");
  }

  const rides = await BikeRide.find({
    patient: patientId,
    status: {
      $in: [/^completed$/i, /^cancelled$/i, /^canceled$/i],
    },
  })
    .populate("rider", "fullName name phone bikeNumber bikeNo")
    .sort({
      completedAt: -1,
      cancelledAt: -1,
      canceledAt: -1,
      updatedAt: -1,
      requestedAt: -1,
      createdAt: -1,
    })
    .lean();

  return rides.map((ride) => {
    const fareAmount = Number(
      ride.fareAmount ||
        ride.amount ||
        ride.totalFare ||
        ride.paymentAmount ||
        0
    );

    return {
      id: String(ride._id || ride.id || ""),
      _id: ride._id,
      rideCode:
        ride.rideCode ||
        `BIKE-${String(ride._id || "").slice(-4).toUpperCase()}`,

      riderName:
        ride.riderInfo?.name ||
        ride.rider?.fullName ||
        ride.rider?.name ||
        "Unknown Rider",

      riderPhone:
        ride.riderInfo?.phone ||
        ride.rider?.phone ||
        "N/A",

      bikeNumber:
        ride.riderInfo?.bikeNumber ||
        ride.rider?.bikeNumber ||
        ride.rider?.bikeNo ||
        "N/A",

      pickupLocation:
        ride.pickupLocation?.address ||
        ride.pickupLocation?.name ||
        ride.pickupText ||
        "N/A",

      dropoffLocation:
        ride.dropoffLocation?.address ||
        ride.dropoffLocation?.name ||
        ride.destinationLocation?.address ||
        ride.destinationLocation?.name ||
        ride.dropoffText ||
        "N/A",

      requestedAt: ride.requestedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      canceledAt: ride.canceledAt,
      updatedAt: ride.updatedAt,
      createdAt: ride.createdAt,

      dateTime:
        ride.completedAt ||
        ride.cancelledAt ||
        ride.canceledAt ||
        ride.updatedAt ||
        ride.requestedAt ||
        ride.createdAt,

      fareAmount,
      fare: `Rs. ${fareAmount.toLocaleString("en-PK")}`,
      paymentStatus: ride.paymentStatus || "unpaid",

      status:
        String(ride.status || "").trim().toLowerCase() === "canceled"
          ? "cancelled"
          : ride.status,
    };
  });
};

const getBikeRiderPastHistory = async (riderId) => {
  if (!riderId) {
    throw new Error("riderId is required");
  }

  if (!mongoose.Types.ObjectId.isValid(riderId)) {
    throw new Error("Invalid rider id");
  }

  const bikeRides = await BikeRide.find({
    rider: riderId,
    status: { $in: ["completed", "cancelled"] },
  })
    .sort({ completedAt: -1, cancelledAt: -1, createdAt: -1 })
    .lean();

  const medDeliveries = await MedicineOrder.find({
    rider: riderId,
    status: { $in: ["delivered", "cancelled"] },
  })
    .sort({ deliveredAt: -1, cancelledAt: -1, createdAt: -1 })
    .lean();

  const formattedRides = bikeRides.map((ride) => ({
    id: String(ride._id || ride.id),
    kind: "ride",
    title: "Bike Ride",
    subline: `Ride ID: ${String(ride.rideCode || ride._id || ride.id)
      .slice(-6)
      .toUpperCase()}`,
    status: ride.status,

    pickupLabel: "Pickup Location",
    pickup:
      ride.pickupLocation?.address ||
      ride.pickupText ||
      ride.pickupLocation?.name ||
      "N/A",

    dropLabel: "Dropoff Location",
    drop:
      ride.dropoffLocation?.address ||
      ride.destinationLocation?.address ||
      ride.dropoffText ||
      ride.dropoffLocation?.name ||
      ride.destinationLocation?.name ||
      "N/A",

    datetime:
      ride.completedAt ||
      ride.cancelledAt ||
      ride.updatedAt ||
      ride.createdAt ||
      ride.requestedAt,

    fare:
      ride.fareAmount ||
      ride.amount ||
      ride.totalFare ||
      ride.paymentAmount ||
      0,
  }));

  const formattedMedicines = medDeliveries.map((order) => ({
    id: String(order._id || order.id),
    kind: "delivery",
    title: "Order Delivery",
    subline: `Order Code: ${
      order.orderCode || String(order._id || order.id).slice(-6).toUpperCase()
    }`,
    status: order.status === "delivered" ? "completed" : order.status,

    pickupLabel: "Pharmacy Vendor",
    pickup:
      order.pharmacyInfo?.name ||
      order.pharmacyInfo?.pharmacyName ||
      order.pharmacy?.fullName ||
      order.pharmacyName ||
      "Pharmacy Processing",

    dropLabel: "Patient Address",
    drop:
      order.deliveryLocation?.address ||
      order.patientAddress ||
      order.address ||
      "N/A",

    datetime:
      order.deliveredAt ||
      order.cancelledAt ||
      order.updatedAt ||
      order.createdAt,

    fare:
      order.amount ||
      order.totalAmount ||
      order.deliveryFee ||
      order.fareAmount ||
      0,
  }));

  const allItems = [...formattedRides, ...formattedMedicines].sort((a, b) => {
    return new Date(b.datetime || 0) - new Date(a.datetime || 0);
  });

  return allItems;
};

module.exports = {
  ACTIVE_BIKE_RIDE_STATUSES,
  ACTIVE_RIDER_RIDE_STATUSES,
  createBikeRideRequest,
  getBikeRideById,
  getActivePatientBikeRide,
  getActiveRiderBikeRide,
  getPendingRideRequests,
  acceptBikeRideRequest,
  updateBikeRideStatus,
  updateBikeRiderLiveLocation,
  markBikeRidePaymentPending,
  updateBikeRidePaymentAmount,
  confirmBikeRidePaymentReceived,
  getPatientBikeRideHistory,
  getBikeRiderPastHistory,
};