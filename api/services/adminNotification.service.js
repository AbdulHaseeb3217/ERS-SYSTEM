const AdminNotification = require("../models/adminNotification.model");

const createBikeRiderRegistrationNotification = async (rider) => {
  if (!rider?._id) return null;

  const existing = await AdminNotification.findOne({
    targetType: "bike_rider",
    targetId: rider._id,
    type: "bike_rider_registration_pending",
  });

  if (existing) {
    return existing.toJSON();
  }

  const notification = await AdminNotification.create({
    title: "New Bike Rider Approval Request",
    message: `${rider.fullName || "Bike Rider"} has registered and is waiting for admin approval.`,
    type: "bike_rider_registration_pending",
    targetType: "bike_rider",
    targetModel: "Rider",
    targetId: rider._id,
    targetName: rider.fullName || "",
    targetPhone: rider.phone || "",
    approvalStatus: "pending",
    isRead: false,
  });

  return notification.toJSON();
};

const createAmbulanceDriverRegistrationNotification = async (driver) => {
  if (!driver?._id) return null;

  const existing = await AdminNotification.findOne({
    targetType: "ambulance_driver",
    targetId: driver._id,
    type: "ambulance_driver_registration_pending",
  });

  if (existing) {
    return existing.toJSON();
  }

  const notification = await AdminNotification.create({
    title: "New Ambulance Driver Approval Request",
    message: `${driver.fullName || "Ambulance Driver"} has registered and is waiting for admin approval.`,
    type: "ambulance_driver_registration_pending",
    targetType: "ambulance_driver",
    targetModel: "AmbulanceDriver",
    targetId: driver._id,
    targetName: driver.fullName || "",
    targetPhone: driver.phone || "",
    approvalStatus: "pending",
    isRead: false,
  });

  return notification.toJSON();
};

const safelyCreateBikeRiderRegistrationNotification = async (rider) => {
  try {
    return await createBikeRiderRegistrationNotification(rider);
  } catch (error) {
    console.warn(
      "⚠️ Bike rider admin notification failed:",
      error.message
    );
    return null;
  }
};

const safelyCreateAmbulanceDriverRegistrationNotification = async (driver) => {
  try {
    return await createAmbulanceDriverRegistrationNotification(driver);
  } catch (error) {
    console.warn(
      "⚠️ Ambulance driver admin notification failed:",
      error.message
    );
    return null;
  }
};

const getAdminNotifications = async ({ limit = 50 } = {}) => {
  const safeLimit = Math.min(Number(limit) || 50, 100);

  const notifications = await AdminNotification.find({})
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  return notifications.map((item) => item.toJSON());
};

const getAdminUnreadCount = async () => {
  return await AdminNotification.countDocuments({
    isRead: false,
    approvalStatus: "pending",
  });
};

const markAdminNotificationRead = async ({ notificationId }) => {
  if (!notificationId) {
    throw new Error("Notification id is required");
  }

  const notification = await AdminNotification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification.toJSON();
};

const markAllAdminNotificationsRead = async () => {
  await AdminNotification.updateMany(
    {
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

const updateRegistrationNotificationStatus = async ({
  targetType,
  targetId,
  approvalStatus,
}) => {
  if (!targetType || !targetId || !approvalStatus) return null;

  const notification = await AdminNotification.findOneAndUpdate(
    {
      targetType,
      targetId,
    },
    {
      $set: {
        approvalStatus,
        isRead: true,
      },
    },
    {
      new: true,
      sort: { createdAt: -1 },
    }
  );

  return notification ? notification.toJSON() : null;
};

module.exports = {
  createBikeRiderRegistrationNotification,
  createAmbulanceDriverRegistrationNotification,

  safelyCreateBikeRiderRegistrationNotification,
  safelyCreateAmbulanceDriverRegistrationNotification,

  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  updateRegistrationNotificationStatus,
};