const express = require("express");
const router = express.Router();

const adminNotificationController = require("../controllers/adminNotification.controller");

router.get("/", adminNotificationController.getAdminNotifications);

router.get(
  "/unread-count",
  adminNotificationController.getAdminUnreadCount
);

router.patch(
  "/:id/read",
  adminNotificationController.markAdminNotificationRead
);

router.patch(
  "/read-all",
  adminNotificationController.markAllAdminNotificationsRead
);

module.exports = router;