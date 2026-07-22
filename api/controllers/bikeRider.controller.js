const bikeRiderService = require("../services/bikeRider.service");


const registerBikeRider = async (req, res) => {
  try {
    const rider = await bikeRiderService.createBikeRider(req.body);

    return res.status(201).json({
      success: true,
      message: "Bike rider registered successfully",
      rider,
    });
  } catch (error) {
    console.error("❌ Error in registerBikeRider():", error);


    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `${field} already registered`,
        type: "DUPLICATE_DB",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Error in registerBikeRider()",
    });
  }
};


const bikeRiderLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
      });
    }

    const result = await bikeRiderService.bikeRiderLogin({ phone, password });

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      rider: result.rider,
    });
  } catch (error) {
    console.error("❌ Error in bikeRiderLogin():", error);
    return res.status(500).json({
      success: false,
      message: "Error in bikeRiderLogin()",
      error: error.message,
    });
  }
};


const forgotBikeRiderPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await bikeRiderService.requestPasswordReset(email);

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
  } catch (error) {
    console.error("❌ Error in forgotBikeRiderPassword():", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error in forgotBikeRiderPassword()",
    });
  }
};


const resetBikeRiderPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const result = await bikeRiderService.resetPassword({ email, newPassword });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("❌ Error in resetBikeRiderPassword():", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Error in resetBikeRiderPassword()",
    });
  }
};


const getBikeRiderProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await bikeRiderService.getBikeRiderProfile(id);

    return res.status(200).json({
      success: true,
      rider,
    });
  } catch (error) {
    console.error("❌ Error in getBikeRiderProfile():", error);
    return res.status(404).json({
      success: false,
      message: error.message || "Bike rider not found",
    });
  }
};


const updateBikeRiderProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await bikeRiderService.updateBikeRiderProfile(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Bike rider profile updated successfully",
      rider,
    });
  } catch (error) {
    console.error("❌ Error in updateBikeRiderProfile():", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Error in updateBikeRiderProfile()",
    });
  }
};

module.exports = {
  registerBikeRider,
  bikeRiderLogin,
  forgotBikeRiderPassword,
  resetBikeRiderPassword,
  getBikeRiderProfile,
  updateBikeRiderProfile,
};
