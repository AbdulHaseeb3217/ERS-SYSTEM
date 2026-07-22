// services/admin.service.js
const Admin = require("../models/admin.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const authenticateAdmin = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });

  if (!admin) {
    throw new Error("Invalid email or password.");
  }


  if (admin.status && admin.status === "disabled") {
    throw new Error("Your admin account is disabled.");
  }

 
  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid email or password.");
  }

  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET || "strong_secret_key",
    { expiresIn: "24h" }
  );

  return {
    token,
    user: {
      id: admin._id,
      name: admin.fullName,
      email: admin.email,
      phone: admin.phone || "",
      role: admin.role,
      avatar: (admin.fullName || "A").charAt(0).toUpperCase(),
    },
  };
};

module.exports = { authenticateAdmin };
