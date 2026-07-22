const express = require("express");
const {
  createEmergencyRequest,
  listPendingRequests,
  acceptRequest,
  checkRequestStatus,
  getActivePatientSession,
  getActiveDriverSession,
  updateRequestStatus,
  updateTravelDetails,
  selectHospitalForRequest,
  markPaymentPendingForRequest,
  updatePaymentAmount,
  confirmPaymentReceived,
} = require("../controllers/ambulanceRequest.controller");

const router = express.Router();

// patient creates
router.post("/request", createEmergencyRequest);

// driver reads pending
router.get("/request/pending", listPendingRequests);

// Driver accepts request
router.post("/accept", acceptRequest);

// Patient polls status
router.get("/status/:requestId", checkRequestStatus);

// Persistence Check: Login ke baad dashboard se check karne ke liye
router.get("/active-session/:patientId", getActivePatientSession);

// Driver active ride check login ke baad
router.get("/active-driver-session/:driverId", getActiveDriverSession);

// Status Update
router.post("/status/update", updateRequestStatus);

// Update Distance & ETA
router.post("/travel-info/update", updateTravelDetails);

// Patient ya driver selected hospital confirm karega
router.post("/hospital/select", selectHospitalForRequest);

// Ride hospital pohanchne ke baad payment pending mode mein jayegi
router.post("/payment/pending", markPaymentPendingForRequest);

// Driver payment amount save karega
router.post("/payment/amount/update", updatePaymentAmount);

// Driver confirm karega ke payment receive ho gayi
router.post("/payment/confirm", confirmPaymentReceived);

// ==========================================
// FETCH PATIENT'S COMPLETED + CANCELLED HISTORY
// URL: /api/ambulance/patient/completed-rides/:patientId
// ==========================================
router.get("/patient/completed-rides/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;

    const AmbulanceRequest = require("../models/ambulanceRequest.model");
    require("../models/patient.model");
    require("../models/ambulanceDriver.model");

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    const rides = await AmbulanceRequest.find({
      patient: patientId,
      status: {
        $in: [/^completed$/i, /^cancelled$/i, /^canceled$/i],
      },
    })
      .populate("driver")
      .populate("patient")
      .sort({
        completedAt: -1,
        cancelledAt: -1,
        updatedAt: -1,
        requestedAt: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Patient completed and cancelled rides fetched successfully",
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("❌ Error fetching patient past rides:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

// ==========================================
// FETCH DRIVER'S COMPLETED + CANCELLED PAST RIDES
// URL: /api/ambulance/driver/completed-rides/:driverId
// ==========================================
router.get("/driver/completed-rides/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    const AmbulanceRequest = require("../models/ambulanceRequest.model");
    require("../models/patient.model");
    require("../models/ambulanceDriver.model");

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "driverId is required",
      });
    }

    const rides = await AmbulanceRequest.find({
      driver: driverId,
      status: {
        $in: [/^completed$/i, /^cancelled$/i, /^canceled$/i],
      },
    })
      .populate("patient")
      .populate("driver")
      .sort({
        completedAt: -1,
        cancelledAt: -1,
        updatedAt: -1,
        requestedAt: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Driver completed and cancelled rides fetched successfully",
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("❌ Error fetching driver past rides:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

// ==========================================
// FETCH ALL REQUESTS FOR ADMIN PANEL
// URL: /api/ambulance/admin/all-requests
// ==========================================
router.get("/admin/all-requests", async (req, res) => {
  try {
    const AmbulanceRequest = require("../models/ambulanceRequest.model");
    require("../models/patient.model");
    require("../models/ambulanceDriver.model");

    const requests = await AmbulanceRequest.find({})
      .populate("patient")
      .populate("driver")
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("❌ Error fetching all requests for admin:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

// ==========================================
// FETCH SPECIFIC DRIVER'S COMPLETED + CANCELLED HISTORY FOR ADMIN
// URL: /api/ambulance/admin/driver-history/:driverId
// ==========================================
router.get("/admin/driver-history/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    const AmbulanceRequest = require("../models/ambulanceRequest.model");
    require("../models/patient.model");
    require("../models/ambulanceDriver.model");

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "driverId is required",
      });
    }

    const history = await AmbulanceRequest.find({
      driver: driverId,
      status: {
        $in: [/^completed$/i, /^cancelled$/i, /^canceled$/i],
      },
    })
      .populate("patient")
      .populate("driver")
      .sort({
        completedAt: -1,
        cancelledAt: -1,
        updatedAt: -1,
        requestedAt: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("❌ Error fetching driver history for admin:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

module.exports = router;