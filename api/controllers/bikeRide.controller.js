// api/controllers/bikeRide.controller.js

const bikeRideService = require("../services/bikeRide.service");
const notificationService = require("../services/notification.service");

const createBikeRideRequest = async (req, res) => {
  try {
    const ride = await bikeRideService.createBikeRideRequest(req.body);

    return res.status(201).json({
      success: true,
      message: "Bike ride request created successfully",
      ride,
    });
  } catch (error) {
    console.error("❌ Error in createBikeRideRequest():", error);

    if (error.code === "ACTIVE_BIKE_RIDE_EXISTS") {
      return res.status(error.statusCode || 409).json({
        success: false,
        type: "ACTIVE_BIKE_RIDE_EXISTS",
        message: error.message,
        ride: error.activeRide,
        activeRide: error.activeRide,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Error in createBikeRideRequest()",
      type: "SERVICE_ERROR",
    });
  }
};

const getBikeRideById = async (req, res) => {
  try {
    const ride = await bikeRideService.getBikeRideById(req.params.id);

    return res.status(200).json({
      success: true,
      ride,
    });
  } catch (error) {
    console.error("❌ Error in getBikeRideById():", error);

    if (error.message === "Ride not found") {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error in getBikeRideById()",
      error: error.message,
    });
  }
};

const getActivePatientRide = async (req, res) => {
  try {
    const ride = await bikeRideService.getActivePatientBikeRide(
      req.params.patientId
    );

    return res.status(200).json({
      success: true,
      hasActiveRide: !!ride,
      status: ride?.status || null,
      ride,
      activeRide: ride,
    });
  } catch (error) {
    console.error("❌ Error in getActivePatientRide():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in getActivePatientRide()",
    });
  }
};

const getActiveRiderRide = async (req, res) => {
  try {
    const ride = await bikeRideService.getActiveRiderBikeRide(
      req.params.riderId
    );

    return res.status(200).json({
      success: true,
      hasActiveRide: !!ride,
      status: ride?.status || null,
      ride,
      activeRide: ride,
    });
  } catch (error) {
    console.error("❌ Error in getActiveRiderRide():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in getActiveRiderRide()",
    });
  }
};

const getBikeRideStatus = async (req, res) => {
  try {
    const ride = await bikeRideService.getBikeRideById(req.params.rideId);

    return res.status(200).json({
      success: true,
      status: ride.status,
      ride,
    });
  } catch (error) {
    console.error("❌ Error in getBikeRideStatus():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in getBikeRideStatus()",
    });
  }
};

const getPendingRides = async (req, res) => {
  try {
    const rides = await bikeRideService.getPendingRideRequests();

    return res.status(200).json({
      success: true,
      message: "Pending rides fetched",
      rides,
    });
  } catch (error) {
    console.error("❌ Error in getPendingRides():", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Error in getPendingRides()",
    });
  }
};

const acceptBikeRideRequest = async (req, res) => {
  try {
    const rideId = req.body.rideId || req.body.requestId || req.params.id;
    const riderId = req.body.riderId || req.body.rider;

    const ride = await bikeRideService.acceptBikeRideRequest({
      rideId,
      riderId,
    });

    await notificationService.safelyCreateBikeRideRequestNotification({
      patient: ride.patient?._id || ride.patient,
      requestId: ride._id,
      status: ride.status,
    });

    return res.status(200).json({
      success: true,
      message: "Bike ride request accepted successfully",
      ride,
      data: ride,
    });
  } catch (error) {
    console.error("❌ Error in acceptBikeRideRequest():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in acceptBikeRideRequest()",
    });
  }
};

const updateBikeRideStatus = async (req, res) => {
  try {
    const ride = await bikeRideService.updateBikeRideStatus({
      rideId: req.body.rideId || req.body.requestId,
      status: req.body.status,
      riderId: req.body.riderId || req.body.rider,
      cancelledBy: req.body.cancelledBy,
    });

    await notificationService.safelyCreateBikeRideRequestNotification({
      patient: ride.patient?._id || ride.patient,
      requestId: ride._id,
      status: ride.status,
    });

    return res.status(200).json({
      success: true,
      message: "Bike ride status updated successfully",
      status: ride.status,
      ride,
      data: ride,
    });
  } catch (error) {
    console.error("❌ Error in updateBikeRideStatus():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in updateBikeRideStatus()",
    });
  }
};

const updateBikeRiderLiveLocation = async (req, res) => {
  try {
    const ride = await bikeRideService.updateBikeRiderLiveLocation({
      rideId: req.body.rideId || req.body.requestId,
      riderId: req.body.riderId || req.body.rider,
      lat: req.body.lat,
      lng: req.body.lng,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    });

    return res.status(200).json({
      success: true,
      message: "Bike rider live location updated successfully",
      ride,
      data: ride,
    });
  } catch (error) {
    console.error("❌ Error in updateBikeRiderLiveLocation():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in updateBikeRiderLiveLocation()",
    });
  }
};

const markBikeRidePaymentPending = async (req, res) => {
  try {
    const ride = await bikeRideService.markBikeRidePaymentPending({
      rideId: req.body.rideId || req.body.requestId,
      riderId: req.body.riderId || req.body.rider,
    });

    return res.status(200).json({
      success: true,
      message: "Bike ride moved to payment pending",
      status: ride.status,
      ride,
      data: ride,
    });
  } catch (error) {
    console.error("❌ Error in markBikeRidePaymentPending():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in markBikeRidePaymentPending()",
    });
  }
};

const updateBikeRidePaymentAmount = async (req, res) => {
  try {
    const ride = await bikeRideService.updateBikeRidePaymentAmount({
      rideId: req.body.rideId || req.body.requestId,
      riderId: req.body.riderId || req.body.rider,
      fareAmount: req.body.fareAmount,
    });

    return res.status(200).json({
      success: true,
      message: "Bike ride payment amount updated successfully",
      fareAmount: ride.fareAmount,
      ride,
      data: ride,
    });
  } catch (error) {
    console.error("❌ Error in updateBikeRidePaymentAmount():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in updateBikeRidePaymentAmount()",
    });
  }
};

const confirmBikeRidePaymentReceived = async (req, res) => {
  try {
    const ride = await bikeRideService.confirmBikeRidePaymentReceived({
      rideId: req.body.rideId || req.body.requestId,
      riderId: req.body.riderId || req.body.rider,
    });

    await notificationService.safelyCreateBikeRideRequestNotification({
      patient: ride.patient?._id || ride.patient,
      requestId: ride._id,
      status: ride.status,
    });

    return res.status(200).json({
      success: true,
      message: "Bike ride payment confirmed successfully",
      status: ride.status,
      paymentStatus: ride.paymentStatus,
      ride,
      data: ride,
    });
  } catch (error) {
    console.error("❌ Error in confirmBikeRidePaymentReceived():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in confirmBikeRidePaymentReceived()",
    });
  }
};


const getPatientBikeRideHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const rides = await bikeRideService.getPatientBikeRideHistory(patientId);

    return res.status(200).json({
      success: true,
      message: "Patient completed and cancelled bike rides fetched successfully",
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("❌ Error in getPatientBikeRideHistory():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in getPatientBikeRideHistory()",
    });
  }
};

const getBikeRiderPastHistory = async (req, res) => {
  try {
    const { riderId } = req.params;

    const items = await bikeRideService.getBikeRiderPastHistory(riderId);

    return res.status(200).json({
      success: true,
      message: "Bike rider past history fetched successfully",
      items,
    });
  } catch (error) {
    console.error("❌ Error in getBikeRiderPastHistory():", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Error in getBikeRiderPastHistory()",
    });
  }
};

module.exports = {
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
  getPatientBikeRideHistory,
  getBikeRiderPastHistory,
};