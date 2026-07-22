const express = require("express");
const router = express.Router();

const {
  getPatientNotifications,
  getPatientUnreadCount,
  markNotificationRead,
  markAllPatientNotificationsRead,
} = require("../controllers/notification.controller");

// Patient ambulance notifications fetch
router.get("/patient/:patientId", getPatientNotifications);

// Patient unread ambulance notifications count
router.get("/patient/:patientId/unread-count", getPatientUnreadCount);

// Single notification read
router.patch("/:id/read", markNotificationRead);

// Patient ki all ambulance notifications read
router.patch("/patient/:patientId/read-all", markAllPatientNotificationsRead);

module.exports = router;