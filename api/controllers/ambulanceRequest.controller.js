const ambulanceRequestService = require("../services/ambulanceRequest.service");

// ✅ NEW: Database notification service
const notificationService = require("../services/notification.service");

// ✅ Patient creates request
const createEmergencyRequest = async (req, res) => {
  try {
    const { patientId, pickupLocation, requestFor } = req.body;

    if (!patientId || !pickupLocation || !requestFor) {
      return res.status(400).json({
        success: false,
        message: "patientId, pickupLocation, and requestFor are required",
      });
    }

    const requestDoc =
      await ambulanceRequestService.createEmergencyAmbulanceRequest({
        patientId,
        pickupLocation,
        requestFor,
      });

    return res.status(201).json({
      success: true,
      message: "Emergency ambulance request created successfully",
      request: requestDoc,
    });
  } catch (error) {
    console.error("❌ Error in createEmergencyRequest():", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error in createEmergencyRequest()",
    });
  }
};

// ✅ Driver lists pending requests
const listPendingRequests = async (req, res) => {
  try {
    const { driverId } = req.query;
    const requests = await ambulanceRequestService.getPendingRequests(driverId);

    return res.status(200).json({
      success: true,
      message: "Pending requests fetched",
      requests,
    });
  } catch (error) {
    console.error("❌ Error in listPendingRequests():", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error in listPendingRequests()",
    });
  }
};

// ✅ Driver accepts request controller
const acceptRequest = async (req, res) => {
  try {
    const { requestId, driverId } = req.body;

    if (!requestId || !driverId) {
      return res.status(400).json({
        success: false,
        message: "requestId and driverId are required",
      });
    }

    const request = await ambulanceRequestService.acceptEmergencyRequest(
      requestId,
      driverId
    );

    if (!request) {
      return res.status(400).json({
        success: false,
        message: "Request already accepted by another driver or is unavailable.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Request assigned successfully",
      request,
    });
  } catch (error) {
    console.error("❌ Error in acceptRequest():", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Patient checks request status
const checkRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ambulanceRequestService.getRequestById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    return res.status(200).json({
      success: true,
      status: request.status,
      request,
      driver: request.driver,
    });
  } catch (error) {
    console.error("❌ Error in checkRequestStatus():", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Patient active session check
const getActivePatientSession = async (req, res) => {
  try {
    const { patientId } = req.params;

    const activeRequest =
      await ambulanceRequestService.findActiveRequestByPatient(patientId);

    if (!activeRequest) {
      return res.status(200).json({
        success: true,
        hasActiveRequest: false,
      });
    }

    if (activeRequest.status === "no_driver") {
      return res.status(200).json({
        success: true,
        hasActiveRequest: true,
        status: activeRequest.status,
        request: activeRequest,
        driver: activeRequest.driver,
      });
    }

    if (
      activeRequest.status === "cancelled" ||
      activeRequest.status === "canceled" ||
      activeRequest.status === "completed"
    ) {
      return res.status(200).json({
        success: true,
        hasActiveRequest: false,
        status: activeRequest.status,
        request: activeRequest,
        driver: activeRequest.driver,
      });
    }

    const statusesToRedirect = [
      "pending",
      "accepted",
      "in-progress",
      "in_progress",
      "arrived_at_patient",
      "navigating_to_hospital",
      "payment_pending",
    ];

    const shouldRedirect = statusesToRedirect.includes(activeRequest.status);

    return res.status(200).json({
      success: true,
      hasActiveRequest: shouldRedirect,
      status: activeRequest.status,
      request: activeRequest,
      driver: activeRequest.driver,
    });
  } catch (error) {
    console.error("❌ Error in getActivePatientSession():", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Driver active ride session check
const getActiveDriverSession = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "driverId is required",
      });
    }

    const activeRequest =
      await ambulanceRequestService.findActiveRequestByDriver(driverId);

    if (!activeRequest) {
      return res.status(200).json({
        success: true,
        hasActiveRide: false,
      });
    }

    return res.status(200).json({
      success: true,
      hasActiveRide: true,
      status: activeRequest.status,
      request: activeRequest,
      driver: activeRequest.driver,
    });
  } catch (error) {
    console.error("❌ Error in getActiveDriverSession:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Update Status
const updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body;
    const AmbulanceRequest = require("../models/ambulanceRequest.model");

    if (!requestId || !status) {
      return res.status(400).json({
        success: false,
        message: "requestId and status are required",
      });
    }

    const updated = await AmbulanceRequest.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    )
      .populate("driver")
      .populate("patient");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // ✅ NEW: Safe database notification
    // Agar notification fail bhi ho jaye to status update flow break nahi hoga
    await notificationService.safelyCreateAmbulanceRequestNotification({
      patient: updated.patient?._id || updated.patient,
      requestId: updated._id,
      status: updated.status,
    });

    return res.status(200).json({
      success: true,
      message: "Status updated",
      request: updated,
    });
  } catch (error) {
    console.error("❌ Error in updateRequestStatus():", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Update Travel Info
const updateTravelDetails = async (req, res) => {
  try {
    const { requestId, distance, duration } = req.body;

    if (!requestId || distance === undefined || duration === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const updated = await ambulanceRequestService.updateRequestTravelInfo(
      requestId,
      distance,
      duration
    );

    return res.status(200).json({
      success: true,
      message: "Travel details updated",
      request: updated,
    });
  } catch (error) {
    console.error("❌ Error in updateTravelDetails():", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Patient ya driver selected hospital confirm karega
const selectHospitalForRequest = async (req, res) => {
  try {
    const { requestId, selectedHospital, selectedBy } = req.body;

    if (!requestId || !selectedHospital) {
      return res.status(400).json({
        success: false,
        message: "requestId and selectedHospital are required",
      });
    }

    const updated = await ambulanceRequestService.saveSelectedHospital(
      requestId,
      selectedHospital,
      selectedBy
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hospital selected successfully",
      request: updated,
      selectedHospital: updated.selectedHospital,
      driver: updated.driver,
    });
  } catch (error) {
    console.error("❌ Error in selectHospitalForRequest:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Ride hospital pohanchne ke baad payment pending
const markPaymentPendingForRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required",
      });
    }

    const updated =
      await ambulanceRequestService.markRequestPaymentPending(requestId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Request moved to payment pending",
      request: updated,
      driver: updated.driver,
    });
  } catch (error) {
    console.error("❌ Error in markPaymentPendingForRequest:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Driver payment amount save karega
const updatePaymentAmount = async (req, res) => {
  try {
    const { requestId, fareAmount } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required",
      });
    }

    if (fareAmount === undefined || fareAmount === null || fareAmount === "") {
      return res.status(400).json({
        success: false,
        message: "fareAmount is required",
      });
    }

    const updated = await ambulanceRequestService.updateRequestPaymentAmount(
      requestId,
      fareAmount
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment amount updated",
      request: updated,
      fareAmount: updated.fareAmount,
      driver: updated.driver,
    });
  } catch (error) {
    console.error("❌ Error in updatePaymentAmount:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Driver confirm karega ke payment receive ho gayi
const confirmPaymentReceived = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required",
      });
    }

    const updated =
      await ambulanceRequestService.confirmRequestPaymentReceived(requestId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment received and ride completed",
      request: updated,
      paymentStatus: updated.paymentStatus,
      driver: updated.driver,
    });
  } catch (error) {
    console.error("❌ Error in confirmPaymentReceived:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// ✅ FETCH PATIENT COMPLETED + CANCELLED RIDES HISTORY
// ==========================================
const getPatientCompletedRides = async (req, res) => {
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
};

// ==========================================
// ✅ FETCH DRIVER COMPLETED + CANCELLED RIDES HISTORY
// ==========================================
const getDriverCompletedRides = async (req, res) => {
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
};

// ==========================================
// ✅ FETCH ALL REQUESTS FOR ADMIN PANEL
// ==========================================
const getAllRequestsForAdmin = async (req, res) => {
  try {
    const AmbulanceRequest = require("../models/ambulanceRequest.model");
    require("../models/patient.model");
    require("../models/ambulanceDriver.model");

    const requests = await AmbulanceRequest.find({})
      .populate("patient")
      .populate("driver")
      .sort({ createdAt: -1 })
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
};

// ==========================================
// ✅ FETCH SPECIFIC DRIVER HISTORY FOR ADMIN
// ==========================================
const getAdminDriverHistory = async (req, res) => {
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
};

module.exports = {
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

  getPatientCompletedRides,
  getDriverCompletedRides,
  getAllRequestsForAdmin,
  getAdminDriverHistory,
};