// api/services/patient.service.js
const Patient = require("../models/patient.model");
const bcrypt = require("bcryptjs");


const createPatient = async (data) => {
  const {
    fullName,
    phone,
    email,
    emergencyContact,
    address,
    dateOfBirth,
    password,
  } = data;

  
  if (!fullName || !phone || !email || !address || !dateOfBirth || !password) {
    throw new Error("Missing required patient fields");
  }

  
  const existingEmail = await Patient.findOne({ email });
  if (existingEmail) {
    throw new Error("Email is already registered");
  }

 
  const existingPhone = await Patient.findOne({ phone });
  if (existingPhone) {
    throw new Error("Phone number is already registered");
  }


  const passwordHash = await bcrypt.hash(password, 10);

 
  const dobDate = new Date(dateOfBirth);
  if (isNaN(dobDate.getTime())) {
    throw new Error("Invalid dateOfBirth format, expected YYYY-MM-DD");
  }

  const patientData = {
    fullName,
    phone,
    email,
    emergencyContact,
    address,
    dateOfBirth: dobDate,
    passwordHash,
  };

  return await Patient.create(patientData);
};


const Patientlogin = async (data) => {
  try {
    const { phone, password } = data;

    const patient = await Patient.findOne({ phone });
    if (!patient) {
      return { success: false, message: "Patient not found" };
    }

    if (patient.status === "blocked") {
      return { 
        success: false, 
        message: "The admin has blocked your status. You cannot log in. Contact the admin for more information." 
      };
    }

    const isMatch = await bcrypt.compare(password, patient.passwordHash);
    if (!isMatch) {
      return { success: false, message: "Invalid password" };
    }

    if (patient.status === "pending") {
      return { 
        success: false, 
        message: "Your account is currently pending. You cannot log in until admin approves your request." 
      };
    }

    return { success: true, message: "Login successful", patient };
  } catch (error) {
    console.error("❌ Error in patientLogin service:", error);
    return { success: false, message: "Server error" };
  }
};


const verifyEmailForReset = async (email) => {
  const patient = await Patient.findOne({ email });
  if (!patient) {
    return { success: false, message: "No patient found with this email" };
  }
  return { success: true, patient };
};

const resetPasswordByEmail = async ({ email, newPassword }) => {
  const patient = await Patient.findOne({ email });
  if (!patient) {
    return { success: false, message: "No patient found with this email" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  patient.passwordHash = passwordHash;
  await patient.save();

  return { success: true, message: "Password updated successfully" };
};


const updatePatientProfile = async (id, data) => {
  const patient = await Patient.findById(id);
  if (!patient) {
    throw new Error("Patient not found");
  }

  const {
    fullName,
    phone,
    email,
    emergencyContact,
    address,
    dateOfBirth,
  } = data;

  if (!fullName || !phone || !email || !address || !dateOfBirth) {
    throw new Error("Missing required fields for update");
  }

  
  if (email && email !== patient.email) {
    const emailTaken = await Patient.findOne({
      email,
      _id: { $ne: id },
    });
    if (emailTaken) {
      throw new Error("Email is already registered");
    }
  }

  
  if (phone && phone !== patient.phone) {
    const phoneTaken = await Patient.findOne({
      phone,
      _id: { $ne: id },
    });
    if (phoneTaken) {
      throw new Error("Phone number is already registered");
    }
  }

  patient.fullName = fullName;
  patient.phone = phone;
  patient.email = email;
  patient.address = address;
  patient.emergencyContact = emergencyContact;

  if (dateOfBirth) {
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      throw new Error("Invalid dateOfBirth format, expected YYYY-MM-DD");
    }
    patient.dateOfBirth = dobDate;
  }

  await patient.save();
  return patient;
};


const getPatientById = async (id) => {
  const patient = await Patient.findById(id);
  if (!patient) {
    throw new Error("Patient not found");
  }
  return patient;
};

module.exports = {
  createPatient,
  Patientlogin,
  verifyEmailForReset,
  resetPasswordByEmail,
  updatePatientProfile,
  getPatientById,
};
