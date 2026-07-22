const notificationService = require("../services/notification.service");

const getPatientNotifications = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit } = req.query;

    const notifications = await notificationService.getPatientNotifications({
      patientId,
      limit,
    });

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("❌ getPatientNotifications error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Notifications fetch failed",
      notifications: [],
    });
  }
};

const getPatientUnreadCount = async (req, res) => {
  try {
    const { patientId } = req.params;

    const count = await notificationService.getPatientUnreadCount({
      patientId,
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("❌ getPatientUnreadCount error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unread count fetch failed",
      count: 0,
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await notificationService.markNotificationRead({
      notificationId: id,
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("❌ markNotificationRead error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Notification update failed",
    });
  }
};

const markAllPatientNotificationsRead = async (req, res) => {
  try {
    const { patientId } = req.params;

    await notificationService.markAllPatientNotificationsRead({
      patientId,
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("❌ markAllPatientNotificationsRead error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Notifications update failed",
    });
  }
};

module.exports = {
  getPatientNotifications,
  getPatientUnreadCount,
  markNotificationRead,
  markAllPatientNotificationsRead,
};