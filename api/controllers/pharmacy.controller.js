const pharmacyService = require("../services/pharmacy.service");

const formatUser = (pharmacy) => {
  return {
    id: pharmacy._id,
    _id: pharmacy._id,
    pharmacyName: pharmacy.pharmacyName,
    email: pharmacy.email,
    licenseId: pharmacy.licenseNumber,
    licenseNumber: pharmacy.licenseNumber,
    address: pharmacy.address,
    location: pharmacy.location,
    contactNumber: pharmacy.phone,
    phone: pharmacy.phone,
    operatingHours: pharmacy.operatingHours,
    status: pharmacy.status,
    isOnline: pharmacy.isOnline,
    verification: pharmacy.verification || {},
  };
};

const register = async (req, res) => {
  try {
    const result = await pharmacyService.registerPharmacy(req.body);

    return res.status(201).json({
      message: "Pharmacy registration successful",
      user: formatUser(result.pharmacy),
      token: result.token,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Pharmacy registration failed",
    });
  }
};

const login = async (req, res) => {
  try {
    const result = await pharmacyService.loginPharmacy(
      req.body.email,
      req.body.password
    );

    return res.status(200).json({
      message: "Login successful",
      user: formatUser(result.pharmacy),
      token: result.token,
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Invalid email or password",
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    await pharmacyService.verifyPharmacyEmail(req.body.email);

    return res.status(200).json({
      message: "Email verified",
    });
  } catch (error) {
    return res.status(404).json({
      message: error.message || "Email not found",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    await pharmacyService.resetPharmacyPassword(
      req.body.email,
      req.body.newPassword
    );

    return res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Password reset failed",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const pharmacy = await pharmacyService.updatePharmacyProfile(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      message: "Updated",
      user: formatUser(pharmacy),
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Profile update failed",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const pharmacy = await pharmacyService.getPharmacyProfile(req.params.id);

    return res.status(200).json({
      user: formatUser(pharmacy),
    });
  } catch (error) {
    return res.status(404).json({
      message: error.message || "Pharmacy not found",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    await pharmacyService.changePharmacyPassword(
      req.params.id,
      req.body.currentPassword,
      req.body.newPassword
    );

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Password change failed",
    });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await pharmacyService.getPharmacyStats(req.params.id);

    return res.status(200).json({ stats });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Could not fetch stats",
    });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const result = await pharmacyService.toggleOnlineStatus(req.params.id);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Could not toggle status",
    });
  }
};

const getRequests = async (req, res) => {
  try {
    const requests = await pharmacyService.getPendingRequests(req.params.id);

    return res.status(200).json(requests);
  } catch (error) {
    if (error.message && error.message.includes("OFFLINE")) {
      return res.status(400).json({ message: error.message });
    }

    console.error("Get Requests Error:", error);

    return res.status(500).json({
      message: error.message || "Could not fetch prescription requests",
    });
  }
};

const ignoreOrder = async (req, res) => {
  try {
    const { pharmacyId, orderId } = req.body;

    if (!pharmacyId || !orderId) {
      return res.status(400).json({
        message: "pharmacyId and orderId are required",
      });
    }

    const result = await pharmacyService.ignoreRequest(pharmacyId, orderId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Could not ignore request",
    });
  }
};

const approveAndDispatchOrder = async (req, res) => {
  try {
    const {
      pharmacyId,
      orderId,
      medicineAmount,
      equipmentAmount,
      deliveryCharges,
    } = req.body;

    if (!pharmacyId || !orderId) {
      return res.status(400).json({
        message: "pharmacyId and orderId are required",
      });
    }

    const order = await pharmacyService.approveAndDispatchRequest(
      pharmacyId,
      orderId,
      {
        medicineAmount,
        equipmentAmount,
        deliveryCharges,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Prescription request approved and dispatched",
      order,
    });
  } catch (error) {
    console.error("Approve & Dispatch Error:", error);

    return res.status(400).json({
      message: error.message || "Failed to approve prescription request",
    });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resetPassword,
  resetPass: resetPassword,
  updateProfile,
  getProfile,
  changePassword,
  getStats,
  toggleStatus,
  getRequests,
  ignoreOrder,
  approveAndDispatchOrder,
};
