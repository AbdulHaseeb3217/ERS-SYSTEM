const express = require("express");
const connectDB = require("./api/config/db.js");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Invalid JSON received:", err.message);
    return res
      .status(400)
      .json({ message: "Invalid JSON format sent from frontend" });
  }
  next();
});

connectDB();

// Optional debug - backend terminal mein URL show karega
app.use((req, res, next) => {
  console.log("API HIT:", req.method, req.originalUrl);
  next();
});

// ===============================
// OLD ROUTES
// ===============================
app.use("/api", require("./api/routes/patient.route.js"));
app.use("/api/ambulance", require("./api/routes/ambulanceRequest.route.js"));
app.use("/api/bike_rider", require("./api/routes/bikeRider.route.js"));
app.use(
  "/api/ambulance_driver",
  require("./api/routes/ambulanceDriver.route.js")
);

// ===============================
// ✅ NOTIFICATION ROUTES
// Database notifications for patient
// URL examples:
// GET   /api/notifications/patient/:patientId
// GET   /api/notifications/patient/:patientId/unread-count
// PATCH /api/notifications/:id/read
// PATCH /api/notifications/patient/:patientId/read-all
// ===============================
app.use("/api/notifications", require("./api/routes/notification.route.js"));
app.use("/api/admin-notifications", require("./api/routes/adminNotification.route.js"));
app.use("/api/support-chats", require("./api/routes/supportChat.route.js"));

// ===============================
// BIKE RIDE ROUTES
// Purana bhi rakha hai + frontend ke URLs bhi add kar diye
// ===============================
const bikeRideRoutes = require("./api/routes/bikeRide.route.js");

app.use("/api/bikeride", bikeRideRoutes);     // tumhara purana route
app.use("/api/bike-rides", bikeRideRoutes);   // frontend ka route
app.use("/api/bike-ride", bikeRideRoutes);    // frontend fallback route

// ===============================
// OTHER ROUTES
// ===============================
app.use("/api", require("./api/routes/medicineOrder.route.js"));
app.use("/api/pharmacy", require("./api/routes/pharmacy.route.js"));
app.use("/api/admin", require("./api/routes/admin.route.js"));

// ===============================
// 404 HANDLER
// ===============================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

module.exports = app;