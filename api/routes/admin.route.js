const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");

// ==============================
//  AUTH & DASHBOARD
// ==============================
router.post("/login", adminController.loginAdmin);
router.get("/dashboard-stats", adminController.getDashboardStats);

// ==============================
//  ADMIN ORDERS TAB
// ==============================
router.get("/orders/all", adminController.getAllOrdersForAdmin);

// ==============================
//  ADMIN SETTINGS (Profile & Password)
// ==============================
router.put("/profile/update", adminController.updateAdminProfile);
router.put("/profile/change-password", adminController.changeAdminPassword);

// ==============================
// PATIENTS
// ==============================
router.get("/patients", adminController.getAllPatients);
router.patch("/patients/:id", adminController.updatePatientProfile);
router.patch("/patients/:id/status", adminController.updatePatientStatus);

// ==============================
// DRIVERS
// ==============================
router.get("/drivers", adminController.getAllDrivers);
router.get("/drivers/:id", adminController.getDriverById);
router.patch("/drivers/:id", adminController.updateDriverProfile);
router.patch("/drivers/:id/status", adminController.updateDriverStatus);

// ==============================
// RIDERS
// ==============================
router.get("/riders", adminController.getAllRiders);
router.get("/riders/:id", adminController.getRiderById);
router.patch("/riders/:id", adminController.updateRiderProfile);
router.patch("/riders/:id/status", adminController.updateRiderStatus);

// ==============================
// PHARMACIES
// ==============================
router.get("/pharmacies", adminController.getAllPharmacies);
router.get("/pharmacies/:id", adminController.getPharmacyById);
router.patch("/pharmacies/:id", adminController.updatePharmacyProfile);
router.patch("/pharmacies/:id/status", adminController.updatePharmacyStatus);

module.exports = router;
