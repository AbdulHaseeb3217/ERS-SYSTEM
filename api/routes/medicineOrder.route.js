const express = require("express");
const {
  createMedicineOrder,
  getMedicineOrderStatus,
  getActivePatientMedicineOrder,
  getPendingMedicineDeliveryRequests,
  getActiveRiderMedicineDelivery,
  acceptMedicineDeliveryRequest,
  updateMedicineDeliveryRiderLocation,
  markMedicineDeliveryReachedPharmacy,
  markMedicineDeliveryNavigatingToPatient,
  markMedicineDeliveryPaymentPending,
  updateMedicineDeliveryPaymentAmount,
  confirmMedicineDeliveryPaymentReceived,
  cancelPatientMedicineOrder,
  cancelMedicineDeliveryRequest,
  getCompletedPharmacyOrders,
} = require("../controllers/medicineOrder.controller");

const router = express.Router();

router.post("/medicine-orders", createMedicineOrder);

router.get("/medicine-orders/status/:orderId", getMedicineOrderStatus);
router.get("/medicine-orders/active-session/:patientId", getActivePatientMedicineOrder);
router.get("/medicine-orders/pharmacy/:pharmacyId/completed", getCompletedPharmacyOrders);
router.post("/medicine-orders/cancel", cancelPatientMedicineOrder);

// Bike rider side medicine delivery request flow
router.get("/medicine-orders/delivery/pending", getPendingMedicineDeliveryRequests);
router.get("/medicine-orders/delivery/active-rider-session/:riderId", getActiveRiderMedicineDelivery);
router.post("/medicine-orders/delivery/accept", acceptMedicineDeliveryRequest);
router.post("/medicine-orders/delivery/rider-location/update", updateMedicineDeliveryRiderLocation);
router.post("/medicine-orders/delivery/reached-pharmacy", markMedicineDeliveryReachedPharmacy);
router.post("/medicine-orders/delivery/navigate-to-patient", markMedicineDeliveryNavigatingToPatient);
router.post("/medicine-orders/delivery/payment/pending", markMedicineDeliveryPaymentPending);
router.post("/medicine-orders/delivery/payment/amount/update", updateMedicineDeliveryPaymentAmount);
router.post("/medicine-orders/delivery/payment/confirm", confirmMedicineDeliveryPaymentReceived);
router.post("/medicine-orders/delivery/cancel", cancelMedicineDeliveryRequest);

module.exports = router;
