const express = require("express");
const router = express.Router();

const {
  registerAmbulanceDriver,
  loginAmbulanceDriver,
  forgotAmbulanceDriver,
  resetAmbulanceDriverPassword,
  getAmbulanceDriverProfile,
  updateAmbulanceDriverProfile,
  updateDriverLocation,
} = require("../controllers/ambulanceDriver.controller");

router.post("/register", registerAmbulanceDriver);
router.post("/login", loginAmbulanceDriver);

// ✅ Live tracking ke liye driver location update route
router.post("/update-location", updateDriverLocation);

router.post("/forgot-password", forgotAmbulanceDriver);
router.post("/reset-password", resetAmbulanceDriverPassword);

router.get("/profile/:id", getAmbulanceDriverProfile);
router.put("/profile/:id", updateAmbulanceDriverProfile);

module.exports = router;