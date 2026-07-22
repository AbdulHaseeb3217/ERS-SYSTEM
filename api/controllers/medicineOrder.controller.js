const medicineOrderService = require("../services/medicineOrder.service");
const notificationService = require("../services/notification.service");

const createMedicineOrder = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Request body missing. Make sure express.json middleware is enabled and body size limit is enough.",
      });
    }

    const order = await medicineOrderService.createMedicineOrder(req.body);

    return res.status(201).json({
      success: true,
      message: "Medicine order created successfully",
      order,
    });
  } catch (error) {
    console.error("❌ Error in createMedicineOrder():", error.message);

    return res.status(400).json({
      success: false,
      message: error.message || "Error while creating medicine order",
    });
  }
};

const getMedicineOrderStatus = async (req, res) => {
  try {
    const order = await medicineOrderService.getMedicineOrderById(
      req.params.orderId
    );

    return res.status(200).json({
      success: true,
      status: order.status,
      order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch medicine order status",
    });
  }
};

const getActivePatientMedicineOrder = async (req, res) => {
  try {
    const order = await medicineOrderService.getActivePatientMedicineOrder(
      req.params.patientId
    );

    return res.status(200).json({
      success: true,
      hasActiveOrder: !!order,
      status: order?.status || null,
      order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch active medicine order",
    });
  }
};

const getPendingMedicineDeliveryRequests = async (req, res) => {
  try {
    const orders =
      await medicineOrderService.getPendingMedicineDeliveryRequests(req.query.riderId);

    return res.status(200).json({
      success: true,
      orders,
      requests: orders,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to fetch pending medicine delivery requests",
    });
  }
};

const getActiveRiderMedicineDelivery = async (req, res) => {
  try {
    const order = await medicineOrderService.getActiveRiderMedicineDelivery(
      req.params.riderId
    );

    return res.status(200).json({
      success: true,
      hasActiveDelivery: !!order,
      status: order?.status || null,
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch active medicine delivery",
    });
  }
};

const acceptMedicineDeliveryRequest = async (req, res) => {
  try {
    const order = await medicineOrderService.acceptMedicineDeliveryRequest({
      orderId: req.body.orderId || req.body.id,
      riderId: req.body.riderId,
    });

    await notificationService.safelyCreateMedicineOrderNotification({
      patient: order.patient?._id || order.patient,
      requestId: order._id,
      status: order.status,
    });

    return res.status(200).json({
      success: true,
      message: "Medicine delivery request accepted successfully",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to accept medicine delivery request",
    });
  }
};

const updateMedicineDeliveryRiderLocation = async (req, res) => {
  try {
    const order = await medicineOrderService.updateMedicineDeliveryRiderLocation(
      {
        orderId: req.body.orderId,
        riderId: req.body.riderId,
        lat: req.body.lat,
        lng: req.body.lng,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Medicine delivery rider location updated",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update medicine delivery location",
    });
  }
};

const markMedicineDeliveryReachedPharmacy = async (req, res) => {
  try {
    const order =
      await medicineOrderService.markMedicineDeliveryReachedPharmacy({
        orderId: req.body.orderId || req.body.id,
        riderId: req.body.riderId,
      });

    return res.status(200).json({
      success: true,
      message: "Medicine delivery marked as reached pharmacy",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to mark medicine delivery as reached pharmacy",
    });
  }
};

const markMedicineDeliveryNavigatingToPatient = async (req, res) => {
  try {
    const order =
      await medicineOrderService.markMedicineDeliveryNavigatingToPatient({
        orderId: req.body.orderId || req.body.id,
        riderId: req.body.riderId,
      });

    return res.status(200).json({
      success: true,
      message: "Medicine delivery is now navigating to patient",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to start navigation to patient",
    });
  }
};

const markMedicineDeliveryPaymentPending = async (req, res) => {
  try {
    const order = await medicineOrderService.markMedicineDeliveryPaymentPending(
      {
        orderId: req.body.orderId || req.body.id,
        riderId: req.body.riderId,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Medicine delivery moved to payment pending",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to move medicine delivery to payment pending",
    });
  }
};

const updateMedicineDeliveryPaymentAmount = async (req, res) => {
  try {
    const order =
      await medicineOrderService.updateMedicineDeliveryPaymentAmount({
        orderId: req.body.orderId || req.body.id,
        riderId: req.body.riderId,
        amount: req.body.amount ?? req.body.fareAmount,
      });

    return res.status(200).json({
      success: true,
      message: "Medicine delivery payment amount updated",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to update medicine delivery payment amount",
    });
  }
};

const confirmMedicineDeliveryPaymentReceived = async (req, res) => {
  try {
    const order =
      await medicineOrderService.confirmMedicineDeliveryPaymentReceived({
        orderId: req.body.orderId || req.body.id,
        riderId: req.body.riderId,
      });

    await notificationService.safelyCreateMedicineOrderNotification({
      patient: order.patient?._id || order.patient,
      requestId: order._id,
      status: order.status,
    });

    return res.status(200).json({
      success: true,
      message: "Medicine delivery payment confirmed and order delivered",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to confirm medicine delivery payment",
    });
  }
};

const cancelPatientMedicineOrder = async (req, res) => {
  try {
    const order = await medicineOrderService.cancelPatientMedicineOrder({
      orderId: req.body.orderId || req.body.id,
      patientId: req.body.patientId,
    });

    await notificationService.safelyCreateMedicineOrderNotification({
      patient: order.patient?._id || order.patient,
      requestId: order._id,
      status: order.status,
    });

    return res.status(200).json({
      success: true,
      message: "Medicine order cancelled successfully",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel medicine order",
    });
  }
};

const cancelMedicineDeliveryRequest = async (req, res) => {
  try {
    const order = await medicineOrderService.cancelMedicineDeliveryRequest({
      orderId: req.body.orderId || req.body.id,
      riderId: req.body.riderId,
    });

    await notificationService.safelyCreateMedicineOrderNotification({
      patient: order.patient?._id || order.patient,
      requestId: order._id,
      status: order.status,
    });

    return res.status(200).json({
      success: true,
      message: "Medicine delivery request cancelled successfully",
      order,
      delivery: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to cancel medicine delivery request",
    });
  }
};

const getCompletedPharmacyOrders = async (req, res) => {
  try {
    const data = await medicineOrderService.getCompletedPharmacyOrders(
      req.params.pharmacyId
    );

    return res.status(200).json({
      success: true,
      orders: data.orders,
      stats: data.stats,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch completed pharmacy orders",
    });
  }
};

module.exports = {
  createMedicineOrder,
  getMedicineOrderStatus,
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