const AmbulanceRequest = require("../models/ambulanceRequest.model");
const Patient = require("../models/patient.model");
const AmbulanceDriver = require("../models/ambulanceDriver.model");

// ✅ NEW: Database notification service
const notificationService = require("./notification.service");

const {
  throwIfPatientHasActiveRequest,
} = require("./patientActiveRequest.service");

const generateOrderCode = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AMB-${rand}`;
};

// ✅ Distance calculator: driver location se patient pickup tak
const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return null;
  }

  const R = 6371;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLng = ((Number(lng2) - Number(lng1)) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// ✅ GeoJSON coordinates [lng, lat] se lat/lng nikalna
const getLatLngFromPoint = (location) => {
  const coords = location?.coordinates;

  if (!Array.isArray(coords) || coords.length !== 2) {
    return null;
  }

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return { lat, lng };
};

// ✅ Selected hospital object se lat/lng nikalna
const getLatLngFromSelectedHospital = (selectedHospital) => {
  const coords = selectedHospital?.location?.coordinates;

  const rawLat =
    selectedHospital?.lat ??
    selectedHospital?.latitude ??
    selectedHospital?.location?.lat ??
    selectedHospital?.geometry?.location?.lat ??
    (Array.isArray(coords) ? coords[1] : null);

  const rawLng =
    selectedHospital?.lng ??
    selectedHospital?.longitude ??
    selectedHospital?.location?.lng ??
    selectedHospital?.geometry?.location?.lng ??
    (Array.isArray(coords) ? coords[0] : null);

  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return { lat, lng };
};

const createEmergencyAmbulanceRequest = async ({
  patientId,
  pickupLocation,
  requestFor,
}) => {
  if (!patientId) throw new Error("patientId is required");

  const allowedRequestFor = ["self", "family", "random_person"];
  if (!allowedRequestFor.includes(requestFor)) {
    throw new Error("Valid requestFor selection is required");
  }

  if (
    !pickupLocation ||
    pickupLocation.lat == null ||
    pickupLocation.lng == null
  ) {
    throw new Error("pickupLocation.lat & pickupLocation.lng are required");
  }

  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error("Patient not found");

  // ✅ NEW: ambulance / bike / medicine mein se koi bhi active request hogi to new request block hogi
  await throwIfPatientHasActiveRequest(patient._id);

  // Optional: if Patient schema supports it
  patient.location = {
    type: "Point",
    coordinates: [pickupLocation.lng, pickupLocation.lat],
  };

  patient.totalEmergencyCalls = (patient.totalEmergencyCalls || 0) + 1;
  await patient.save();

  const orderCode = generateOrderCode();

  const reqPayload = {
    patient: patient._id,
    orderCode,
    patientInfo: {
      name: patient.fullName || "",
      phone: patient.phone || "",
    },
    pickupLocation: {
      address: pickupLocation.address || patient.address || "",
      type: "Point",
      coordinates: [pickupLocation.lng, pickupLocation.lat],
    },
    requestFor,
    priority: "critical",
    status: "pending",
    requestedAt: new Date(),
  };

  const requestDoc = await AmbulanceRequest.create(reqPayload);
  return requestDoc;
};

// ✅ Only show pending requests (driver app uses this)
const getPendingRequests = async (driverId) => {
  const list = await AmbulanceRequest.find({ status: "pending" })
    .sort({ requestedAt: -1 })
    .limit(50)
    .lean();

  // ✅ Agar driverId nahi aaya, purana flow same rahega
  if (!driverId) {
    return list;
  }

  const driver = await AmbulanceDriver.findById(driverId).lean();

  if (!driver) {
    return list;
  }

  const driverPoint = getLatLngFromPoint(driver.location);

  // ✅ Agar driver location abhi sync nahi hui ya default [0,0] hai, distance/ETA na lagao
  if (
    !driverPoint ||
    (Number(driverPoint.lat) === 0 && Number(driverPoint.lng) === 0)
  ) {
    return list;
  }

  const averageSpeedKmH = 35;

  const requestsWithDistance = list.map((request) => {
    const pickupPoint = getLatLngFromPoint(request.pickupLocation);

    if (!pickupPoint) {
      return request;
    }

    const distanceKm = calculateDistanceKm(
      driverPoint.lat,
      driverPoint.lng,
      pickupPoint.lat,
      pickupPoint.lng
    );

    if (distanceKm == null) {
      return request;
    }

    const etaMinutes = Math.max(
      1,
      Math.ceil((distanceKm / averageSpeedKmH) * 60)
    );

    return {
      ...request,
      distanceKmToPatient: Number(distanceKm.toFixed(2)),
      etaMinutesToPatient: etaMinutes,
    };
  });

  return requestsWithDistance;
};

// ✅ ADDED: Driver accepts request (Atomic update to prevent double-accept)
const acceptEmergencyRequest = async (requestId, driverId) => {
  const updatedRequest = await AmbulanceRequest.findOneAndUpdate(
    { _id: requestId, status: "pending" },
    {
      $set: {
        driver: driverId,
        status: "accepted",
      },
    },
    { new: true }
  ).populate("driver");

  // ✅ NEW: Safe database notification
  // Agar notification fail bhi ho jaye to request accept flow break nahi hoga
  if (updatedRequest) {
    await notificationService.safelyCreateAmbulanceRequestNotification({
      patient: updatedRequest.patient,
      requestId: updatedRequest._id,
      status: updatedRequest.status,
    });
  }

  return updatedRequest;
};

// ✅ ADDED: Fetch request by ID for polling
const getRequestById = async (requestId) => {
  return await AmbulanceRequest.findById(requestId).populate("driver");
};

// ✅ ADDED: Find latest active request for a patient (Persistence logic)
const findActiveRequestByPatient = async (patientId) => {
  return await AmbulanceRequest.findOne({
    patient: patientId,
  })
    .sort({ requestedAt: -1, createdAt: -1 })
    .populate("driver")
    .lean();
};

// ✅ NEW: Find latest active request for a driver
const findActiveRequestByDriver = async (driverId) => {
  if (!driverId) {
    return null;
  }

  const latestRequest = await AmbulanceRequest.findOne({
    driver: driverId,
  })
    .sort({ requestedAt: -1, createdAt: -1 })
    .populate("driver")
    .lean();

  if (!latestRequest) {
    return null;
  }

  const activeStatuses = [
    "accepted",
    "in-progress",
    "arrived_at_patient",
    "navigating_to_hospital",
    "payment_pending",
  ];

  if (!activeStatuses.includes(latestRequest.status)) {
    return null;
  }

  return latestRequest;
};

// ✅ NEW: Update Distance and ETA in DB (Professional Tracking ke liye)
const updateRequestTravelInfo = async (requestId, distance, duration) => {
  return await AmbulanceRequest.findByIdAndUpdate(
    requestId,
    {
      $set: {
        distanceKmToPatient: distance,
        etaMinutesToPatient: duration,
      },
    },
    { new: true }
  );
};

// ✅ NEW: Patient ya driver ka selected hospital save karne ke liye
const saveSelectedHospital = async (
  requestIdOrPayload,
  selectedHospitalArg,
  selectedByArg
) => {
  let requestId = requestIdOrPayload;
  let selectedHospital = selectedHospitalArg;
  let selectedBy = selectedByArg;

  // ✅ Controller agar object format bhej de to bhi same function work karega
  if (
    requestIdOrPayload &&
    typeof requestIdOrPayload === "object" &&
    !selectedHospitalArg
  ) {
    requestId = requestIdOrPayload.requestId;
    selectedHospital = requestIdOrPayload.selectedHospital;
    selectedBy = requestIdOrPayload.selectedBy;
  }

  if (!requestId) throw new Error("requestId is required");
  if (!selectedHospital) throw new Error("selectedHospital is required");

  const hospitalPoint = getLatLngFromSelectedHospital(selectedHospital);

  if (!hospitalPoint) {
    console.log("INVALID SELECTED HOSPITAL:", selectedHospital);
    throw new Error("selectedHospital lat/lng are required");
  }

  const hospitalPayload = {
    placeId: selectedHospital.placeId || selectedHospital.place_id || "",
    name: selectedHospital.name || "",
    address:
      selectedHospital.address ||
      selectedHospital.vicinity ||
      selectedHospital?.location?.address ||
      "",
    rating:
      selectedHospital.rating !== undefined && selectedHospital.rating !== null
        ? selectedHospital.rating
        : "Rating not available",
    openNow:
      selectedHospital.openNow === true
        ? true
        : selectedHospital.openNow === false
        ? false
        : undefined,
    openingTime: selectedHospital.openingTime || "",
    phone: selectedHospital.phone || "",
    lat: hospitalPoint.lat,
    lng: hospitalPoint.lng,
    location: {
      address:
        selectedHospital.address ||
        selectedHospital.vicinity ||
        selectedHospital?.location?.address ||
        "",
      type: "Point",
      coordinates: [hospitalPoint.lng, hospitalPoint.lat],
    },
    selectedBy: selectedBy || "patient",
    selectedAt: new Date(),
  };

  return await AmbulanceRequest.findByIdAndUpdate(
    requestId,
    {
      $set: {
        selectedHospital: hospitalPayload,

        // ✅ existing fields bhi update rahenge taake old flow break na ho
        hospitalName: hospitalPayload.name,
        hospitalLocation: hospitalPayload.location,

        // ✅ hospital confirm hote hi ride hospital navigation mode mein chali jayegi
        status: "navigating_to_hospital",
      },
    },
    { new: true }
  ).populate("driver");
};

// ✅ NEW: Ride hospital pohanchne ke baad payment pending mode mein le jane ke liye
const markRequestPaymentPending = async (requestId) => {
  if (!requestId) throw new Error("requestId is required");

  return await AmbulanceRequest.findByIdAndUpdate(
    requestId,
    {
      $set: {
        status: "payment_pending",
        paymentStatus: "unpaid",
      },
    },
    { new: true }
  ).populate("driver");
};

// ✅ NEW: Driver payment amount patient ko bhejne ke liye save karega
const updateRequestPaymentAmount = async (requestId, fareAmount) => {
  if (!requestId) throw new Error("requestId is required");

  const amount = Number(fareAmount);

  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Valid fareAmount is required");
  }

  return await AmbulanceRequest.findByIdAndUpdate(
    requestId,
    {
      $set: {
        fareAmount: amount,
        status: "payment_pending",
        paymentStatus: "unpaid",
      },
    },
    { new: true }
  ).populate("driver");
};

// ✅ NEW: Driver confirm karega ke payment receive ho gayi
const confirmRequestPaymentReceived = async (requestId) => {
  if (!requestId) throw new Error("requestId is required");

  const updatedRequest = await AmbulanceRequest.findByIdAndUpdate(
    requestId,
    {
      $set: {
        status: "completed",
        paymentStatus: "paid",
      },
    },
    { new: true }
  ).populate("driver");

  // ✅ NEW: Safe database notification
  // Agar notification fail bhi ho jaye to payment/completed flow break nahi hoga
  if (updatedRequest) {
    await notificationService.safelyCreateAmbulanceRequestNotification({
      patient: updatedRequest.patient,
      requestId: updatedRequest._id,
      status: updatedRequest.status,
    });
  }

  return updatedRequest;
};

module.exports = {
  createEmergencyAmbulanceRequest,
  getPendingRequests,
  acceptEmergencyRequest,
  getRequestById,
  findActiveRequestByPatient,
  findActiveRequestByDriver,
  updateRequestTravelInfo,
  saveSelectedHospital,
  markRequestPaymentPending,
  updateRequestPaymentAmount,
  confirmRequestPaymentReceived,
};