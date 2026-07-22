const Notification = require("../models/notification.model");

const normalizeRequestStatus = (status) => {
  const cleanStatus = String(status || "").toLowerCase().trim();

  if (cleanStatus === "canceled") return "cancelled";
  if (cleanStatus === "cancelled") return "cancelled";

  if (cleanStatus === "accepted") return "accepted";
  if (cleanStatus === "delivering") return "accepted";
  if (cleanStatus === "dispatching") return "accepted";

  if (cleanStatus === "completed") return "completed";
  if (cleanStatus === "delivered") return "completed";

  return "";
};

const getAmbulanceNotificationText = (status) => {
  const cleanStatus = normalizeRequestStatus(status);

  if (cleanStatus === "accepted") {
    return {
      title: "Ambulance Request Accepted",
      message: "Your ambulance request has been accepted by a driver.",
      type: "ambulance_request_accepted",
    };
  }

  if (cleanStatus === "cancelled") {
    return {
      title: "Ambulance Request Cancelled",
      message: "Your ambulance request has been cancelled.",
      type: "ambulance_request_cancelled",
    };
  }

  if (cleanStatus === "completed") {
    return {
      title: "Ambulance Request Completed",
      message: "Your ambulance request has been completed successfully.",
      type: "ambulance_request_completed",
    };
  }

  return null;
};

const getBikeRideNotificationText = (status) => {
  const cleanStatus = normalizeRequestStatus(status);

  if (cleanStatus === "accepted") {
    return {
      title: "Bike Ride Request Accepted",
      message: "Your bike ride request has been accepted by a rider.",
      type: "bike_ride_request_accepted",
    };
  }

  if (cleanStatus === "cancelled") {
    return {
      title: "Bike Ride Request Cancelled",
      message: "Your bike ride request has been cancelled.",
      type: "bike_ride_request_cancelled",
    };
  }

  if (cleanStatus === "completed") {
    return {
      title: "Bike Ride Request Completed",
      message: "Your bike ride request has been completed successfully.",
      type: "bike_ride_request_completed",
    };
  }

  return null;
};

const getMedicineOrderNotificationText = (status) => {
  const cleanStatus = normalizeRequestStatus(status);

  if (cleanStatus === "accepted") {
    return {
      title: "Medicine Order Accepted",
      message: "Your medicine order has been accepted for delivery.",
      type: "medicine_order_accepted",
    };
  }

  if (cleanStatus === "cancelled") {
    return {
      title: "Medicine Order Cancelled",
      message: "Your medicine order has been cancelled.",
      type: "medicine_order_cancelled",
    };
  }

  if (cleanStatus === "completed") {
    return {
      title: "Medicine Order Completed",
      message: "Your medicine order has been delivered successfully.",
      type: "medicine_order_completed",
    };
  }

  return null;
};

const createAmbulanceRequestNotification = async ({
  patient,
  requestId,
  status,
}) => {
  const cleanStatus = normalizeRequestStatus(status);

  if (!patient) {
    throw new Error("Patient id is required for notification");
  }

  if (!requestId) {
    throw new Error("Ambulance request id is required for notification");
  }

  if (!["accepted", "cancelled", "completed"].includes(cleanStatus)) {
    return null;
  }

  const text = getAmbulanceNotificationText(cleanStatus);

  if (!text) {
    return null;
  }

  const existingNotification = await Notification.findOne({
    patient,
    requestType: "ambulance",
    requestId,
    status: cleanStatus,
    type: text.type,
  });

  if (existingNotification) {
    return existingNotification.toJSON();
  }

  const notification = await Notification.create({
    patient,
    title: text.title,
    message: text.message,
    type: text.type,
    requestType: "ambulance",
    requestModel: "AmbulanceRequest",
    requestId,
    status: cleanStatus,
  });

  return notification.toJSON();
};

const createBikeRideRequestNotification = async ({
  patient,
  requestId,
  status,
}) => {
  const cleanStatus = normalizeRequestStatus(status);

  if (!patient) {
    throw new Error("Patient id is required for notification");
  }

  if (!requestId) {
    throw new Error("Bike ride request id is required for notification");
  }

  if (!["accepted", "cancelled", "completed"].includes(cleanStatus)) {
    return null;
  }

  const text = getBikeRideNotificationText(cleanStatus);

  if (!text) {
    return null;
  }

  const existingNotification = await Notification.findOne({
    patient,
    requestType: "bike_ride",
    requestId,
    status: cleanStatus,
    type: text.type,
  });

  if (existingNotification) {
    return existingNotification.toJSON();
  }

  const notification = await Notification.create({
    patient,
    title: text.title,
    message: text.message,
    type: text.type,
    requestType: "bike_ride",
    requestModel: "BikeRide",
    requestId,
    status: cleanStatus,
  });

  return notification.toJSON();
};

const createMedicineOrderNotification = async ({
  patient,
  requestId,
  status,
}) => {
  const cleanStatus = normalizeRequestStatus(status);

  if (!patient) {
    throw new Error("Patient id is required for notification");
  }

  if (!requestId) {
    throw new Error("Medicine order id is required for notification");
  }

  if (!["accepted", "cancelled", "completed"].includes(cleanStatus)) {
    return null;
  }

  const text = getMedicineOrderNotificationText(cleanStatus);

  if (!text) {
    return null;
  }

  const existingNotification = await Notification.findOne({
    patient,
    requestType: "medicine_order",
    requestId,
    status: cleanStatus,
    type: text.type,
  });

  if (existingNotification) {
    return existingNotification.toJSON();
  }

  const notification = await Notification.create({
    patient,
    title: text.title,
    message: text.message,
    type: text.type,
    requestType: "medicine_order",
    requestModel: "MedicineOrder",
    requestId,
    status: cleanStatus,
  });

  return notification.toJSON();
};

const safelyCreateAmbulanceRequestNotification = async ({
  patient,
  requestId,
  status,
}) => {
  try {
    return await createAmbulanceRequestNotification({
      patient,
      requestId,
      status,
    });
  } catch (error) {
    console.warn(
      "⚠️ Ambulance notification failed but request flow continued:",
      error.message
    );

    return null;
  }
};

const safelyCreateBikeRideRequestNotification = async ({
  patient,
  requestId,
  status,
}) => {
  try {
    return await createBikeRideRequestNotification({
      patient,
      requestId,
      status,
    });
  } catch (error) {
    console.warn(
      "⚠️ Bike ride notification failed but request flow continued:",
      error.message
    );

    return null;
  }
};

const safelyCreateMedicineOrderNotification = async ({
  patient,
  requestId,
  status,
}) => {
  try {
    return await createMedicineOrderNotification({
      patient,
      requestId,
      status,
    });
  } catch (error) {
    console.warn(
      "⚠️ Medicine order notification failed but request flow continued:",
      error.message
    );

    return null;
  }
};

const getPatientNotifications = async ({ patientId, limit = 50 }) => {
  if (!patientId) {
    throw new Error("Patient id is required");
  }

  const safeLimit = Math.min(Number(limit) || 50, 100);

  const notifications = await Notification.find({
    patient: patientId,
  })
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  return notifications.map((notification) => notification.toJSON());
};

const getPatientUnreadCount = async ({ patientId }) => {
  if (!patientId) {
    throw new Error("Patient id is required");
  }

  const count = await Notification.countDocuments({
    patient: patientId,
    isRead: false,
  });

  return count;
};

const markNotificationRead = async ({ notificationId }) => {
  if (!notificationId) {
    throw new Error("Notification id is required");
  }

  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification.toJSON();
};

const markAllPatientNotificationsRead = async ({ patientId }) => {
  if (!patientId) {
    throw new Error("Patient id is required");
  }

  await Notification.updateMany(
    {
      patient: patientId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
      },
    }
  );

  return {
    success: true,
  };
};

module.exports = {
  createAmbulanceRequestNotification,
  safelyCreateAmbulanceRequestNotification,

  createBikeRideRequestNotification,
  safelyCreateBikeRideRequestNotification,

  createMedicineOrderNotification,
  safelyCreateMedicineOrderNotification,

  getPatientNotifications,
  getPatientUnreadCount,
  markNotificationRead,
  markAllPatientNotificationsRead,
};