const MedicineOrder = require("../models/medicineOrder.model");
const Patient = require("../models/patient.model");
const Pharmacy = require("../models/pharmacy.model");
const Rider = require("../models/rider.model");

const {
  throwIfPatientHasActiveRequest,
} = require("./patientActiveRequest.service");


const isValidLngLat = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  return Number.isFinite(lng) && Number.isFinite(lat) && !(lng === 0 && lat === 0) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
};

const calculateDistanceKm = (fromCoords, toCoords) => {
  if (!isValidLngLat(fromCoords) || !isValidLngLat(toCoords)) return null;
  const [lng1, lat1] = fromCoords.map(Number);
  const [lng2, lat2] = toCoords.map(Number);
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getDeliveryChargeCategory = (distanceKm) => {
  if (distanceKm <= 3) return { key: "up_to_3_km", label: "0–3 km", charge: 100 };
  if (distanceKm <= 6) return { key: "up_to_6_km", label: "3–6 km", charge: 150 };
  if (distanceKm <= 10) return { key: "up_to_10_km", label: "6–10 km", charge: 200 };
  if (distanceKm <= 15) return { key: "up_to_15_km", label: "10–15 km", charge: 300 };
  return { key: "above_15_km", label: "15+ km", charge: 400 };
};

const buildRiderDeliveryQuote = ({ riderCoords, pharmacyCoords, patientCoords }) => {
  const riderToPharmacyKm = calculateDistanceKm(riderCoords, pharmacyCoords);
  const pharmacyToPatientKm = calculateDistanceKm(pharmacyCoords, patientCoords);
  if (riderToPharmacyKm == null) throw new Error("Rider current location is required to calculate delivery charges");
  if (pharmacyToPatientKm == null) throw new Error("Pharmacy or patient location is invalid");
  const totalDistanceKm = riderToPharmacyKm + pharmacyToPatientKm;
  const category = getDeliveryChargeCategory(totalDistanceKm);
  return { riderToPharmacyKm, pharmacyToPatientKm, totalDistanceKm, category: category.key, categoryLabel: category.label, deliveryCharges: category.charge };
};

const ACTIVE_PATIENT_MEDICINE_STATUSES = [
  "pharmacy_processing",
  "dispatching",
  "delivering",
  "reached_pharmacy",
  "navigating_to_patient",
  "payment_pending",
];

// Active session resume ke liye delivered bhi include hai, taake rider confirm payment
// ke baad patient side par one-time Payment Done Successfully popup aa sake.
// Duplicate new order check ke liye ACTIVE_PATIENT_MEDICINE_STATUSES hi use hoti hai,
// isliye delivered order new order ko block nahi karega.
const PATIENT_RESUMABLE_MEDICINE_STATUSES = [
  ...ACTIVE_PATIENT_MEDICINE_STATUSES,
  "delivered",
];

const ACTIVE_RIDER_DELIVERY_STATUSES = [
  "delivering",
  "reached_pharmacy",
  "navigating_to_patient",
  "payment_pending",
];

const normalizeLocation = (
  location,
  fallbackAddress = "Current GPS location"
) => {
  if (!location) return null;

  const lat = location.lat ?? location.latitude ?? location.coordinates?.[1];
  const lng = location.lng ?? location.longitude ?? location.coordinates?.[0];

  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return null;
  }

  return {
    address: location.address || fallbackAddress,
    coordinates: [Number(lng), Number(lat)],
  };
};

const populateOrder = (query) =>
  query
    .populate("patient", "fullName phone address location")
    .populate("pharmacy", "pharmacyName phone address location")
    .populate("rider", "fullName phone bikeNumber location");

const createMedicineOrder = async (data = {}) => {
  const {
    patientId,
    medicinesText,
    equipmentText,
    priority,
    deliveryLocation,
    prescriptionImageUrl,
  } = data;

  if (!patientId) throw new Error("patientId is required");

  const patient = await Patient.findById(patientId);
  if (!patient) throw new Error("Patient not found");

  // ✅ NEW: ambulance / bike / medicine mein se koi bhi active request hogi to new request block hogi
  await throwIfPatientHasActiveRequest(patient._id);

  const existingActiveOrder = await MedicineOrder.findOne({
    patient: patient._id,
    status: { $in: ACTIVE_PATIENT_MEDICINE_STATUSES },
  }).sort({ updatedAt: -1, requestedAt: -1 });

  if (existingActiveOrder) {
    throw new Error(
      "Aap ki medicine request already chal rahi hai. Jab tak purani request complete ya cancel nahi hoti, aap new request submit nahi kar sakte."
    );
  }

  if (!medicinesText || !medicinesText.trim()) {
    throw new Error("Required medicines are missing.");
  }

  if (!prescriptionImageUrl || typeof prescriptionImageUrl !== "string") {
    throw new Error("Prescription image is required (Base64 format).");
  }

  if (!prescriptionImageUrl.startsWith("data:image/")) {
    throw new Error("Invalid prescription image format.");
  }

  const medicineItems = (medicinesText || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const equipmentItems = (equipmentText || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const lastOrder = await MedicineOrder.findOne()
    .sort({ createdAt: -1 })
    .lean();

  let seq = 1;

  if (lastOrder?.orderCode) {
    const match = lastOrder.orderCode.match(/MED-(\d+)/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }

  const orderCode = `MED-${String(seq).padStart(3, "0")}`;

  let deliveryLoc = normalizeLocation(deliveryLocation, "Current GPS location");

  if (!deliveryLoc && patient.location?.coordinates?.length === 2) {
    deliveryLoc = {
      address: patient.address || "Current GPS location",
      coordinates: patient.location.coordinates,
    };
  }

  if (!deliveryLoc) {
    deliveryLoc = { address: "Current GPS location", coordinates: undefined };
  }

  const orderData = {
    patient: patient._id,
    orderCode,
    patientInfo: {
      name: patient.fullName,
      phone: patient.phone,
    },
    deliveryLocation: deliveryLoc,
    medicineItems,
    equipmentItems,
    prescriptionImageUrl,
    priority: priority === "emergency" ? "emergency" : "regular",
    status: "pharmacy_processing",
    requestedAt: new Date(),
  };

  const order = await MedicineOrder.create(orderData);

  patient.totalMedicineOrders = (patient.totalMedicineOrders || 0) + 1;
  await patient.save();

  return order;
};

const getMedicineOrderById = async (orderId) => {
  const order = await populateOrder(MedicineOrder.findById(orderId));
  if (!order) throw new Error("Medicine order not found");
  return order;
};

const getActivePatientMedicineOrder = async (patientId) => {
  if (!patientId) throw new Error("patientId is required");

  return await populateOrder(
    MedicineOrder.findOne({
      patient: patientId,
      status: { $in: PATIENT_RESUMABLE_MEDICINE_STATUSES },
    }).sort({ updatedAt: -1, requestedAt: -1 })
  );
};

const getPendingMedicineDeliveryRequests = async (riderId) => {
  if (!riderId) throw new Error("riderId is required");
  const rider = await Rider.findById(riderId).lean();
  if (!rider) throw new Error("Rider not found");
  const orders = await populateOrder(
    MedicineOrder.find({
      status: "dispatching",
      pharmacy: { $ne: null },
      $or: [{ rider: null }, { rider: { $exists: false } }],
    }).sort({ approvedAt: -1, updatedAt: -1 })
  );
  return orders.map((orderDoc) => {
    const order = orderDoc.toObject ? orderDoc.toObject() : orderDoc;
    const quote = buildRiderDeliveryQuote({
      riderCoords: rider.location?.coordinates,
      pharmacyCoords: order.pharmacy?.location?.coordinates,
      patientCoords: order.deliveryLocation?.coordinates,
    });
    const medicineAmount = Number(order.pricing?.medicineAmount || 0);
    const equipmentAmount = Number(order.pricing?.equipmentAmount || 0);
    return {
      ...order,
      riderQuote: quote,
      pricing: {
        ...(order.pricing || {}),
        medicineAmount,
        equipmentAmount,
        deliveryCharges: quote.deliveryCharges,
        totalAmount: medicineAmount + equipmentAmount + quote.deliveryCharges,
      },
      riderEarning: quote.deliveryCharges,
    };
  });
};

const getActiveRiderMedicineDelivery = async (riderId) => {
  if (!riderId) throw new Error("riderId is required");

  return await populateOrder(
    MedicineOrder.findOne({
      rider: riderId,
      status: { $in: ACTIVE_RIDER_DELIVERY_STATUSES },
    }).sort({ riderAssignedAt: -1, updatedAt: -1 })
  );
};

const acceptMedicineDeliveryRequest = async ({ orderId, riderId }) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");
  const rider = await Rider.findById(riderId);
  if (!rider) throw new Error("Rider not found");
  const availableOrder = await populateOrder(MedicineOrder.findOne({
    _id: orderId,
    status: "dispatching",
    pharmacy: { $ne: null },
    $or: [{ rider: null }, { rider: { $exists: false } }],
  }));
  if (!availableOrder) throw new Error("Delivery request already accepted or not available");
  const quote = buildRiderDeliveryQuote({
    riderCoords: rider.location?.coordinates,
    pharmacyCoords: availableOrder.pharmacy?.location?.coordinates,
    patientCoords: availableOrder.deliveryLocation?.coordinates,
  });
  const medicineAmount = Number(availableOrder.pricing?.medicineAmount || 0);
  const equipmentAmount = Number(availableOrder.pricing?.equipmentAmount || 0);
  const update = {
    rider: rider._id,
    riderInfo: { name: rider.fullName || rider.name || "", phone: rider.phone || "", bikeNumber: rider.bikeNumber || "" },
    status: "delivering",
    riderAssignedAt: new Date(),
    riderEarning: quote.deliveryCharges,
    pricing: { medicineAmount, equipmentAmount, deliveryCharges: quote.deliveryCharges, totalAmount: medicineAmount + equipmentAmount + quote.deliveryCharges },
    amount: medicineAmount + equipmentAmount + quote.deliveryCharges,
  };
  if (isValidLngLat(rider.location?.coordinates)) {
    update.riderLiveLocation = { address: rider.location?.address || "Rider current location", coordinates: rider.location.coordinates };
    update.riderLocationUpdatedAt = new Date();
  }
  const accepted = await MedicineOrder.findOneAndUpdate({
    _id: orderId, status: "dispatching", $or: [{ rider: null }, { rider: { $exists: false } }],
  }, { $set: update }, { new: true });
  if (!accepted) throw new Error("Delivery request already accepted by another rider");
  return await getMedicineOrderById(accepted._id);
};

const updateMedicineDeliveryRiderLocation = async ({
  orderId,
  riderId,
  lat,
  lng,
  latitude,
  longitude,
}) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");

  const finalLat = Number(lat ?? latitude);
  const finalLng = Number(lng ?? longitude);

  if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
    throw new Error("Valid lat/lng are required");
  }

  const order = await MedicineOrder.findOne({
    _id: orderId,
    rider: riderId,
    status: { $in: ACTIVE_RIDER_DELIVERY_STATUSES },
  });

  if (!order) throw new Error("Active medicine delivery not found");

  order.riderLiveLocation = {
    address: "Rider current location",
    coordinates: [finalLng, finalLat],
  };
  order.riderLocationUpdatedAt = new Date();

  await order.save();
  return await getMedicineOrderById(order._id);
};

const markMedicineDeliveryReachedPharmacy = async ({ orderId, riderId }) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");

  const order = await MedicineOrder.findOne({
    _id: orderId,
    rider: riderId,
    status: "delivering",
  });

  if (!order)
    throw new Error("Active medicine delivery not found or already reached pharmacy");

  order.status = "reached_pharmacy";
  order.reachedPharmacyAt = new Date();

  await order.save();
  return await getMedicineOrderById(order._id);
};

const markMedicineDeliveryNavigatingToPatient = async ({ orderId, riderId }) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");

  const order = await MedicineOrder.findOne({
    _id: orderId,
    rider: riderId,
    status: "reached_pharmacy",
  });

  if (!order)
    throw new Error(
      "Medicine delivery must be in reached_pharmacy status before navigating to patient"
    );

  order.status = "navigating_to_patient";
  order.navigatingToPatientAt = new Date();

  await order.save();
  return await getMedicineOrderById(order._id);
};

const markMedicineDeliveryPaymentPending = async ({ orderId, riderId }) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");

  const order = await MedicineOrder.findOne({
    _id: orderId,
    rider: riderId,
    status: "navigating_to_patient",
  });

  if (!order)
    throw new Error(
      "Medicine delivery must be navigating_to_patient before payment pending"
    );

  order.status = "payment_pending";
  order.paymentPendingAt = new Date();
  order.paymentStatus = "unpaid";

  await order.save();
  return await getMedicineOrderById(order._id);
};

const updateMedicineDeliveryPaymentAmount = async ({
  orderId,
  riderId,
  amount,
}) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");

  const finalAmount = Number(amount);

  if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
    throw new Error("Valid payment amount is required");
  }

  const order = await MedicineOrder.findOne({
    _id: orderId,
    rider: riderId,
    status: "payment_pending",
  });

  if (!order) throw new Error("Payment pending medicine delivery not found");

  order.amount = finalAmount;
  order.paymentStatus = "unpaid";

  await order.save();
  return await getMedicineOrderById(order._id);
};

const confirmMedicineDeliveryPaymentReceived = async ({ orderId, riderId }) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");

  const order = await MedicineOrder.findOne({
    _id: orderId,
    rider: riderId,
    status: "payment_pending",
  });

  if (!order) throw new Error("Payment pending medicine delivery not found");

  if (!order.amount || Number(order.amount) <= 0) {
    throw new Error("Please set payment amount before confirming payment");
  }

  order.status = "delivered";
  order.paymentStatus = "paid";
  order.deliveredAt = new Date();

  await order.save();
  return await getMedicineOrderById(order._id);
};

const cancelPatientMedicineOrder = async ({ orderId, patientId }) => {
  if (!orderId) throw new Error("orderId is required");

  const query = {
    _id: orderId,
    status: { $in: ACTIVE_PATIENT_MEDICINE_STATUSES },
  };

  if (patientId) {
    query.patient = patientId;
  }

  const order = await MedicineOrder.findOne(query);

  if (!order) throw new Error("Active medicine order not found");

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancelledBy = "patient";

  await order.save();
  return await getMedicineOrderById(order._id);
};

const cancelMedicineDeliveryRequest = async ({ orderId, riderId }) => {
  if (!orderId) throw new Error("orderId is required");
  if (!riderId) throw new Error("riderId is required");

  const order = await MedicineOrder.findOne({
    _id: orderId,
    rider: riderId,
    status: { $in: ACTIVE_RIDER_DELIVERY_STATUSES },
  });

  if (!order) throw new Error("Active medicine delivery not found");

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancelledBy = "rider";

  await order.save();
  return await getMedicineOrderById(order._id);
};

const getCompletedPharmacyOrders = async (pharmacyId) => {
  if (!pharmacyId) throw new Error("pharmacyId is required");

  const orders = await populateOrder(
    MedicineOrder.find({
      pharmacy: pharmacyId,
      status: "delivered",
      paymentStatus: "paid",
    }).sort({ deliveredAt: -1, updatedAt: -1, requestedAt: -1 })
  );

  const mappedOrders = orders.map((order) => {
    const startTime =
      order.riderAssignedAt ||
      order.approvedAt ||
      order.requestedAt ||
      order.createdAt;

    const endTime = order.deliveredAt || order.updatedAt;

    let deliveryMinutes = order.estimatedDeliveryMinutes || 0;

    if (!deliveryMinutes && startTime && endTime) {
      deliveryMinutes = Math.max(
        1,
        Math.round(
          (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
        )
      );
    }

    return {
      id: String(order._id),
      orderId:
        order.orderCode ||
        `ORD-${String(order._id).slice(-4).toUpperCase()}`,
      patientName:
        order.patientInfo?.name || order.patient?.fullName || "Unknown Patient",
      patientPhone: order.patientInfo?.phone || order.patient?.phone || "N/A",
      riderName:
        order.riderInfo?.name ||
        order.rider?.fullName ||
        order.rider?.name ||
        "N/A",
      riderPhone: order.riderInfo?.phone || order.rider?.phone || "N/A",
      bikeNumber:
        order.riderInfo?.bikeNumber || order.rider?.bikeNumber || "N/A",
      orderDate: order.requestedAt || order.createdAt,
      deliveredAt: order.deliveredAt,
      deliveryTime: `${deliveryMinutes || 0} mins`,
      deliveryMinutes: deliveryMinutes || 0,
      medicines: order.medicineItems || [],
      equipment: order.equipmentItems || [],
      items: [...(order.medicineItems || []), ...(order.equipmentItems || [])],

      // NEW: Price breakdown
      medicineAmount: Number(order.pricing?.medicineAmount || 0),
      equipmentAmount: Number(order.pricing?.equipmentAmount || 0),
      deliveryCharges: Number(order.pricing?.deliveryCharges || 0),
      totalAmount: Number(
        order.pricing?.totalAmount || order.amount || 0
      ),
      riderEarning: Number(order.riderEarning || 0),

      status: "Completed",
      rawStatus: order.status,
      paymentStatus: "Paid",
      rawPaymentStatus: order.paymentStatus,
      priority: order.priority,
      deliveryAddress: order.deliveryLocation?.address || "N/A",
    };
  });

  const totalOrders = mappedOrders.length;

  const totalRevenue = mappedOrders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0),
    0
  );

  const avgDeliveryTime = totalOrders
    ? Math.round(
        mappedOrders.reduce(
          (sum, order) => sum + Number(order.deliveryMinutes || 0),
          0
        ) / totalOrders
      )
    : 0;

  return {
    orders: mappedOrders,
    stats: {
      totalOrders,
      totalRevenue,
      avgDeliveryTime,
    },
  };
};

module.exports = {
  createMedicineOrder,
  getMedicineOrderById,
  getActivePatientMedicineOrder,
  getPendingMedicineDeliveryRequests,
  getActiveRiderMedicineDelivery,
  acceptMedicineDeliveryRequest,
  updateMedicineDeliveryRiderLocation,
  markMedicineDeliveryReachedPharmacy,
  markMedicineDeliveryNavigatingToPatient,
  markMedicineDeliveryPaymentPending,
  updateMedicineDeliveryPaymentAmount,
  confirmMedicineDeliveryPaymentReceived,
  cancelPatientMedicineOrder,
  cancelMedicineDeliveryRequest,
  getCompletedPharmacyOrders,
};