// api/routes/bikeRide.route.js

const express = require("express");
const {
  createBikeRideRequest,
  getBikeRideById,
  getActivePatientRide,
  getActiveRiderRide,
  getBikeRideStatus,
  getPendingRides,
  acceptBikeRideRequest,
  updateBikeRideStatus,
  updateBikeRiderLiveLocation,
  markBikeRidePaymentPending,
  updateBikeRidePaymentAmount,
  confirmBikeRidePaymentReceived,
  getBikeRiderPastHistory,

  // ✅ ADD THIS
  getPatientBikeRideHistory,
} = require("../controllers/bikeRide.controller");

const router = express.Router();

// =====================================================================
// ✅ PATIENT BIKE HISTORY
// =====================================================================
router.get("/patient/history/:patientId", getPatientBikeRideHistory);
router.get("/patient/:patientId/history", getPatientBikeRideHistory);

// =====================================================================
// ✅ BIKE RIDER PAST HISTORY ROUTES
// IMPORTANT: Ye routes "/:id" se upar rahenge
// =====================================================================
router.get("/rider/:riderId/past-history", getBikeRiderPastHistory);
router.get("/rider/past-history/:riderId", getBikeRiderPastHistory);
router.get("/history/:riderId", getBikeRiderPastHistory);
router.get("/history/past/:riderId", getBikeRiderPastHistory);

// =====================================================================
// Normal old routes - unchanged
// =====================================================================
router.post("/request", createBikeRideRequest);

router.get("/active-session/:patientId", getActivePatientRide);
router.get("/active-rider-session/:riderId", getActiveRiderRide);
router.get("/status/:rideId", getBikeRideStatus);
router.get("/pending", getPendingRides);

router.post("/accept", acceptBikeRideRequest);
router.post("/status/update", updateBikeRideStatus);
router.post("/payment/pending", markBikeRidePaymentPending);
router.post("/payment/amount/update", updateBikeRidePaymentAmount);
router.post("/payment/confirm", confirmBikeRidePaymentReceived);

router.post("/rider-location/update", updateBikeRiderLiveLocation);
router.post("/update-rider-location", updateBikeRiderLiveLocation);

router.post("/:id/accept", acceptBikeRideRequest);

// Hamesha end par
router.get("/:id", getBikeRideById);

module.exports = router;