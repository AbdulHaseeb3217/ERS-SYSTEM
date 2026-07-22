const ambulanceDriverService = require("../services/ambulanceDriver.service");

const registerAmbulanceDriver = async (req, res) => {
  try {
    const driver = await ambulanceDriverService.registerAmbulanceDriver(req.body);
    return res.status(201).json({ success: true, message: "Registered", driver });
  } catch (err) {
    console.error("❌ registerAmbulanceDriver error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `${field} already registered`,
        type: "DUPLICATE_DB",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Registration failed",
    });
  }
};

const loginAmbulanceDriver = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await ambulanceDriverService.loginAmbulanceDriver({
      phone,
      password,
    });

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      driver: result.driver,
    });
  } catch (err) {
    console.error("❌ loginAmbulanceDriver error:", err);
    return res.status(500).json({
      success: false,
      message: "Error in loginAmbulanceDriver()",
      error: err.message,
    });
  }
};

const forgotAmbulanceDriver = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await ambulanceDriverService.forgotPasswordAmbulanceDriver({
      email,
    });

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error("❌ forgotAmbulanceDriver error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Forgot password failed",
    });
  }
};

const resetAmbulanceDriverPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const result = await ambulanceDriverService.resetPasswordAmbulanceDriver({
      email,
      newPassword,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    console.error("❌ resetAmbulanceDriverPassword error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Reset password failed",
    });
  }
};

const getAmbulanceDriverProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await ambulanceDriverService.getAmbulanceDriverProfile({ id });

    return res.status(200).json({
      success: true,
      driver,
    });
  } catch (err) {
    console.error("❌ getAmbulanceDriverProfile error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to fetch profile",
    });
  }
};

const updateAmbulanceDriverProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await ambulanceDriverService.updateAmbulanceDriverProfile({
      id,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      driver,
    });
  } catch (err) {
    console.error("❌ updateAmbulanceDriverProfile error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `${field} already registered`,
        type: "DUPLICATE_DB",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Profile update failed",
    });
  }
};

// ✅ Update Driver Live Location
const updateDriverLocation = async (req, res) => {
  try {
    const { driverId, lat, lng, heading } = req.body;

    if (!driverId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "driverId, lat, and lng are required",
      });
    }

    const AmbulanceDriver = require("../models/ambulanceDriver.model");

    const updated = await AmbulanceDriver.findByIdAndUpdate(
      driverId,
      {
        $set: {
          "location.coordinates": [lng, lat],
          heading: heading || 0,
          isOnline: true,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
    });
  } catch (err) {
    console.error("❌ updateDriverLocation error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  registerAmbulanceDriver,
  loginAmbulanceDriver,
  forgotAmbulanceDriver,
  resetAmbulanceDriverPassword,
  getAmbulanceDriverProfile,
  updateAmbulanceDriverProfile,
  updateDriverLocation,
};