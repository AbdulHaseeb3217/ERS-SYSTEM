const express = require("express");
const router = express.Router();

const pharmacyController = require("../controllers/pharmacy.controller");

// POST Routes
router.post("/register", pharmacyController.register);
router.post("/login", pharmacyController.login);
router.post("/verify-email", pharmacyController.verifyEmail);

router.post("/ignore-request", pharmacyController.ignoreOrder);
router.post("/approve-dispatch", pharmacyController.approveAndDispatchOrder);

// PUT Routes
router.put("/reset-password", pharmacyController.resetPassword);
router.put("/update/:id", pharmacyController.updateProfile);
router.put("/change-password/:id", pharmacyController.changePassword);
router.put("/toggle-status/:id", pharmacyController.toggleStatus);

// GET Routes
router.get("/profile/:id", pharmacyController.getProfile);
router.get("/stats/:id", pharmacyController.getStats);
router.get("/requests/:id", pharmacyController.getRequests);

module.exports = router;