const express = require("express");
const {
  createPatient,
  Patientlogin,
  forgotPassword,
  resetPassword,
  updatePatientProfile,
  getPatientProfile,

  getPatientBikeRideHistory,
  getPatientMedicineOrderHistory,
  getPatientServiceHistory,
} = require("../controllers/patient.controller");

const router = express.Router();

router.post("/create_patient", createPatient);

router.post("/login", Patientlogin);

router.post("/forgot_password", forgotPassword);

router.post("/reset_password", resetPassword);

/* ✅ Patient History Routes */
router.get("/patient/:id/bike-history", getPatientBikeRideHistory);
router.get("/patient/:id/medicine-history", getPatientMedicineOrderHistory);
router.get("/patient/:id/service-history", getPatientServiceHistory);

/* ✅ Extra aliases, taake route mount /api/patient ho ya /api/patients, dono mein issue na aaye */
router.get("/:id/bike-history", getPatientBikeRideHistory);
router.get("/:id/medicine-history", getPatientMedicineOrderHistory);
router.get("/:id/service-history", getPatientServiceHistory);

/* Profile routes */
router.get("/patient/:id", getPatientProfile);

router.put("/patient/:id", updatePatientProfile);

module.exports = router;