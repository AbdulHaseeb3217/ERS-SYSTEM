const adminNotificationService = require("../services/adminNotification.service");

const getAdminNotifications = async (req, res) => {
  try {
    const notifications =
      await adminNotificationService.getAdminNotifications({
        limit: req.query.limit,
      });

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("❌ getAdminNotifications error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin notifications",
    });
  }
};

const getAdminUnreadCount = async (req, res) => {
  try {
    const count = await adminNotificationService.getAdminUnreadCount();

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("❌ getAdminUnreadCount error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch unread count",
    });
  }
};

const markAdminNotificationRead = async (req, res) => {
  try {
    const notification =
      await adminNotificationService.markAdminNotificationRead({
        notificationId: req.params.id,
      });

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("❌ markAdminNotificationRead error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to mark notification read",
    });
  }
};

const markAllAdminNotificationsRead = async (req, res) => {
  try {
    const result =
      await adminNotificationService.markAllAdminNotificationsRead();

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ markAllAdminNotificationsRead error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to mark all notifications read",
    });
  }
};

module.exports = {
  getAdminNotifications,
  getAdminUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
};